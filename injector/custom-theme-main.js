'use strict';

// Antigravity Studio Kit — main-process theme, localization, telemetry & SHA-256 verified GitHub Release updater.
// Injected into app.asar/dist/custom-theme-main.js by patch_asar_stable.py / mac-preview/build_preview.py.
//
// Design notes:
//  - attach() is called from dist/utils.js createWindow() BEFORE win.loadURL(),
//    so the 'dom-ready' listener is registered before the first navigation.
//  - Checks user-editable ~/.gemini/antigravity/custom_theme/app first (for instant
//    Cmd+R / Ctrl+R hot-reload and 1-click in-app hot updates), then falls back to
//    bundled ../../community-preview-assets.
//  - Discovers local gemini-pulse runtime.json ({ port, token }) (with port.txt fallback).
//  - Checks GitHub Releases at most once every 30 minutes (ETag 304 cached on disk) and serves a
//    token-authenticated loopback control endpoint for in-app update status & SHA-256
//    verified hot updates.

const { ipcMain, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');

const USER_ASSET_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'custom_theme', 'app');
const BUNDLED_ASSET_DIR = path.resolve(__dirname, '../../community-preview-assets');
const assetDirs = [USER_ASSET_DIR, BUNDLED_ASSET_DIR];

const CUSTOM_ROOT_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'custom_theme');
const UPDATE_CACHE_FILE = path.join(CUSTOM_ROOT_DIR, 'update-cache.json');

const TELEMETRY_DIR = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'gemini-pulse', 'sidecars', 'pulse');
const TELEMETRY_RUNTIME_FILE = path.join(TELEMETRY_DIR, 'runtime.json');
const TELEMETRY_PORT_FILE = path.join(TELEMETRY_DIR, 'port.txt');

const CHANNEL = 'custom-theme:set-mode:v1';
const INJECTOR_VERSION = 4;
const UPDATE_CHECK_TTL_MS = 30 * 60 * 1000; // 30 minutes (ETag 304 costs 0 GitHub API quota)
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ALLOWED_DOWNLOAD_HOSTS = new Set([
    'github.com',
    'api.github.com',
    'objects.githubusercontent.com',
    'release-assets.githubusercontent.com',
    'raw.githubusercontent.com',
]);
const ALLOWED_ORIGIN_RE = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/i;
const ALLOWED_HOST_RE = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/i;

const attached = new WeakSet();
const activeContents = new Set();
let ipcReady = false;

let knownTelemetry = { port: null, token: '' };
let portWatch = null;
let watchDebounce = null;
let retryTimer = null;
let retryStep = 0;
const RETRY_DELAYS = [500, 1000, 1500, 2000, 3000, 5000, 5000, 5000];

// Ephemeral loopback control server for in-app update actions (strict token + Origin/Host check)
let updaterServer = null;
let updaterPort = null;
const updaterToken = crypto.randomBytes(24).toString('hex');
const updaterTokenBuf = Buffer.from(updaterToken, 'utf8');
let updateState = null;
let pendingUpdateCheck = null;
let updatePollTimer = null;
let updateApplying = false;

function ensureIpc() {
    if (ipcReady) return;
    ipcReady = true;
    try {
        ipcMain.handle(CHANNEL, () => 'paper');
    } catch (_) {
        // Channel already registered - harmless.
    }
}

function readAsset(name) {
    for (const dir of assetDirs) {
        try {
            const file = path.join(dir, name);
            if (fs.existsSync(file)) {
                return fs.readFileSync(file, 'utf8');
            }
        } catch (error) {
            console.error('[agy-theme] read asset:', error.message);
        }
    }
    return null;
}

function readLocalKitMeta() {
    const fallback = {
        version: '1.2.0',
        injectorVersion: INJECTOR_VERSION,
        repo: 'cool-boy2024/antigravity-studio-kit',
        channel: 'github-releases',
    };
    try {
        const raw = readAsset('kit-meta.json');
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        const repo = typeof parsed.repo === 'string' && REPO_RE.test(parsed.repo.trim())
            ? parsed.repo.trim()
            : fallback.repo;
        const version = typeof parsed.version === 'string' && parsed.version.trim()
            ? parsed.version.trim().replace(/^v/i, '')
            : fallback.version;
        return {
            version,
            injectorVersion: Number(parsed.injectorVersion || INJECTOR_VERSION),
            repo,
            channel: parsed.channel || 'github-releases',
        };
    } catch (_) {
        return fallback;
    }
}

function parseSemver(v) {
    const m = String(v || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isNewerVersion(remoteVer, localVer) {
    const a = parseSemver(remoteVer);
    const b = parseSemver(localVer);
    if (!a || !b) return false;
    for (let i = 0; i < 3; i++) {
        if (a[i] > b[i]) return true;
        if (a[i] < b[i]) return false;
    }
    return false;
}

function httpsGet(urlStr, { timeoutMs = 8000, maxBytes = 4 * 1024 * 1024, redirects = 5, etag = '' } = {}) {
    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(urlStr);
        } catch (err) {
            reject(err);
            return;
        }
        if (parsed.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname.toLowerCase())) {
            reject(new Error(`Blocked download host: ${parsed.hostname}`));
            return;
        }
        const headers = {
            'User-Agent': 'antigravity-studio-kit-updater/1.2',
            'Accept': parsed.hostname === 'api.github.com' ? 'application/vnd.github+json' : '*/*',
        };
        if (etag) headers['If-None-Match'] = etag;
        const req = https.get(
            {
                hostname: parsed.hostname,
                port: parsed.port || 443,
                path: parsed.pathname + parsed.search,
                headers,
                timeout: timeoutMs,
            },
            (res) => {
                if (res.statusCode === 304) {
                    res.resume();
                    resolve({ statusCode: 304, body: Buffer.alloc(0), etag: res.headers.etag || etag });
                    return;
                }
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    if (redirects <= 0) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    const nextUrl = new URL(res.headers.location, urlStr).toString();
                    httpsGet(nextUrl, { timeoutMs, maxBytes, redirects: redirects - 1 }).then(resolve, reject);
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    res.resume();
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                let total = 0;
                res.on('data', (chunk) => {
                    total += chunk.length;
                    if (total > maxBytes) {
                        req.destroy(new Error('Response exceeded size limit'));
                        return;
                    }
                    chunks.push(chunk);
                });
                res.on('end', () => resolve({
                    statusCode: res.statusCode,
                    body: Buffer.concat(chunks),
                    etag: res.headers.etag || '',
                }));
            }
        );
        req.on('timeout', () => req.destroy(new Error('Request timed out')));
        req.on('error', reject);
    });
}

async function httpsGetBuffer(urlStr, timeoutMs = 8000, maxBytes = 4 * 1024 * 1024) {
    const res = await httpsGet(urlStr, { timeoutMs, maxBytes });
    return res.body;
}

function loadUpdateCache() {
    try {
        if (!fs.existsSync(UPDATE_CACHE_FILE)) return null;
        return JSON.parse(fs.readFileSync(UPDATE_CACHE_FILE, 'utf8'));
    } catch (_) {
        return null;
    }
}

function saveUpdateCache(data) {
    try {
        fs.mkdirSync(CUSTOM_ROOT_DIR, { recursive: true });
        const tmp = UPDATE_CACHE_FILE + `.tmp.${process.pid}`;
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
        fs.renameSync(tmp, UPDATE_CACHE_FILE);
    } catch (_) {}
}

function broadcastUpdateState(state) {
    if (!state) return;
    const lit = JSON.stringify(state);
    for (const wc of Array.from(activeContents)) {
        if (!wc || (wc.isDestroyed && wc.isDestroyed())) {
            activeContents.delete(wc);
            continue;
        }
        wc.executeJavaScript(
            `window.__agySetUpdateState && window.__agySetUpdateState(${lit});`,
            true
        ).catch(() => {});
    }
}

async function checkForKitUpdates(force = false) {
    if (pendingUpdateCheck) return pendingUpdateCheck;

    const meta = readLocalKitMeta();
    const cached = loadUpdateCache();
    const now = Date.now();

    if (
        !force &&
        cached &&
        cached.repo === meta.repo &&
        typeof cached.checkedAt === 'number' &&
        now - cached.checkedAt < UPDATE_CHECK_TTL_MS
    ) {
        const available = isNewerVersion(cached.latestVersion, meta.version);
        updateState = {
            ...cached,
            currentVersion: meta.version,
            repo: meta.repo,
            platform: process.platform,
            available,
            applying: updateApplying,
        };
        return updateState;
    }

    pendingUpdateCheck = (async () => {
        try {
            const apiUrl = `https://api.github.com/repos/${meta.repo}/releases/latest`;
            const prevEtag = (!force && cached && cached.repo === meta.repo && cached.etag) ? cached.etag : '';
            const res = await httpsGet(apiUrl, { timeoutMs: 7000, maxBytes: 512 * 1024, etag: prevEtag });
            if (res.statusCode === 304 && cached) {
                const refreshed = {
                    ...cached,
                    currentVersion: meta.version,
                    repo: meta.repo,
                    platform: process.platform,
                    available: isNewerVersion(cached.latestVersion, meta.version),
                    checkedAt: Date.now(),
                    applying: updateApplying,
                };
                saveUpdateCache(refreshed);
                updateState = refreshed;
                broadcastUpdateState(refreshed);
                return refreshed;
            }
            const rel = JSON.parse(res.body.toString('utf8'));
            const tag = String(rel.tag_name || '').trim();
            const latestVersion = tag.replace(/^v/i, '');
            const releaseUrl = typeof rel.html_url === 'string' && rel.html_url.startsWith('https://github.com/')
                ? rel.html_url
                : `https://github.com/${meta.repo}/releases/latest`;
            const assets = Array.isArray(rel.assets) ? rel.assets : [];
            const manifestAsset = assets.find((a) => a && a.name === 'kit-hot-update.json' && typeof a.browser_download_url === 'string');

            let canHotApply = false;
            let requiresFullReinstall = false;
            let manifestUrl = manifestAsset ? manifestAsset.browser_download_url : '';
            if (manifestUrl) {
                try {
                    const mBuf = await httpsGetBuffer(manifestUrl, 7000, 128 * 1024);
                    const manifest = JSON.parse(mBuf.toString('utf8'));
                    const minInj = Number(manifest.minInjectorVersion || 1);
                    if (minInj > INJECTOR_VERSION) {
                        requiresFullReinstall = true;
                        canHotApply = false;
                    } else if (manifest.files && manifest.files['theme.css'] && manifest.files['renderer.js'] && manifest.files['localization_dict.json']) {
                        canHotApply = true;
                    }
                } catch (_) {
                    canHotApply = false;
                }
            }

            const rawNotes = String(rel.body || '').replace(/\r\n/g, '\n').trim();
            const notes = rawNotes.length > 600 ? rawNotes.slice(0, 600) + '…' : rawNotes;

            const next = {
                repo: meta.repo,
                etag: res.etag || '',
                currentVersion: meta.version,
                latestVersion: latestVersion || meta.version,
                tagName: tag || `v${meta.version}`,
                releaseName: String(rel.name || tag || ''),
                releaseUrl,
                publishedAt: rel.published_at || null,
                notes,
                manifestUrl,
                canHotApply,
                requiresFullReinstall,
                available: isNewerVersion(latestVersion, meta.version),
                checkedAt: Date.now(),
                platform: process.platform,
                applying: updateApplying,
                error: null,
            };
            saveUpdateCache(next);
            updateState = next;
            broadcastUpdateState(next);
            return next;
        } catch (err) {
            const fallbackState = {
                ...(updateState || {}),
                repo: meta.repo,
                currentVersion: meta.version,
                latestVersion: (updateState && updateState.latestVersion) || meta.version,
                releaseUrl: `https://github.com/${meta.repo}/releases`,
                available: Boolean(updateState && isNewerVersion(updateState.latestVersion, meta.version)),
                checkedAt: (updateState && updateState.checkedAt) || 0,
                platform: process.platform,
                applying: updateApplying,
                error: force ? String(err && err.message || 'Check failed') : null,
            };
            updateState = fallbackState;
            return fallbackState;
        }
    })().finally(() => {
        pendingUpdateCheck = null;
    });
    return pendingUpdateCheck;
}

async function applyHotUpdate() {
    if (updateApplying) return { ok: false, error: 'already_applying' };
    const state = await checkForKitUpdates(true);
    if (!state || !state.available) {
        return { ok: false, error: 'already_up_to_date', state };
    }
    if (!state.canHotApply || !state.manifestUrl) {
        return { ok: false, error: 'full_update_required', state };
    }

    updateApplying = true;
    try {
        const mBuf = await httpsGetBuffer(state.manifestUrl, 10000, 128 * 1024);
        const manifest = JSON.parse(mBuf.toString('utf8'));
        const minInj = Number(manifest.minInjectorVersion || 1);
        if (minInj > INJECTOR_VERSION) {
            return { ok: false, error: 'full_update_required', state };
        }
        const requiredFiles = ['theme.css', 'renderer.js', 'localization_dict.json'];
        const downloaded = {};

        for (const fname of requiredFiles) {
            const entry = manifest.files && manifest.files[fname];
            if (!entry || typeof entry.url !== 'string' || !/^[0-9a-f]{64}$/i.test(String(entry.sha256 || ''))) {
                throw new Error(`Invalid manifest entry for ${fname}`);
            }
            const buf = await httpsGetBuffer(entry.url, 15000, 4 * 1024 * 1024);
            const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
            if (actualSha.toLowerCase() !== String(entry.sha256).toLowerCase()) {
                throw new Error(`SHA-256 verification failed for ${fname}`);
            }
            if (fname === 'localization_dict.json') {
                const parsed = JSON.parse(buf.toString('utf8'));
                if (!Array.isArray(parsed)) throw new Error('Invalid localization_dict.json');
            }
            downloaded[fname] = buf;
        }

        fs.mkdirSync(USER_ASSET_DIR, { recursive: true });
        for (const fname of requiredFiles) {
            const dst = path.join(USER_ASSET_DIR, fname);
            const tmp = dst + `.update-tmp.${process.pid}`;
            fs.writeFileSync(tmp, downloaded[fname]);
            fs.renameSync(tmp, dst);
        }

        const meta = readLocalKitMeta();
        const nextMeta = {
            ...meta,
            version: String(manifest.version || state.latestVersion).replace(/^v/i, ''),
            updatedAt: new Date().toISOString(),
        };
        const metaPath = path.join(USER_ASSET_DIR, 'kit-meta.json');
        const metaTmp = metaPath + `.update-tmp.${process.pid}`;
        fs.writeFileSync(metaTmp, JSON.stringify(nextMeta, null, 2) + '\n', 'utf8');
        fs.renameSync(metaTmp, metaPath);

        const nextState = {
            ...state,
            currentVersion: nextMeta.version,
            available: false,
            applying: false,
            justUpdated: true,
        };
        saveUpdateCache(nextState);
        updateState = nextState;
        broadcastUpdateState(nextState);

        // Reload active windows shortly after returning success so the new CSS/JS mounts cleanly
        setTimeout(() => {
            for (const wc of Array.from(activeContents)) {
                if (wc && !(wc.isDestroyed && wc.isDestroyed())) {
                    try { wc.reload(); } catch (_) {}
                }
            }
        }, 450);

        return { ok: true, version: nextMeta.version, state: nextState };
    } catch (err) {
        return { ok: false, error: String(err && err.message || err), state: updateState };
    } finally {
        updateApplying = false;
    }
}

function isValidUpdaterToken(candidate) {
    if (typeof candidate !== 'string' || !candidate) return false;
    const buf = Buffer.from(candidate, 'utf8');
    if (buf.length !== updaterTokenBuf.length) return false;
    return crypto.timingSafeEqual(buf, updaterTokenBuf);
}

function ensureUpdaterServer() {
    if (updaterServer) return;
    updaterServer = http.createServer(async (req, res) => {
        const host = String(req.headers.host || '').trim();
        if (!host || !ALLOWED_HOST_RE.test(host)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('forbidden host');
            return;
        }
        const origin = req.headers.origin;
        res.setHeader('Vary', 'Origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (typeof origin === 'string') {
            if (!ALLOWED_ORIGIN_RE.test(origin)) {
                res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('forbidden origin');
                return;
            }
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agy-Kit-Token');
        }
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const headerTok = String(req.headers['x-agy-kit-token'] || '').trim();
        if (!isValidUpdaterToken(headerTok)) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
            return;
        }

        const url = new URL(req.url || '/', 'http://127.0.0.1');
        if (url.pathname === '/status' && req.method === 'GET') {
            const st = updateState || {
                ...readLocalKitMeta(),
                currentVersion: readLocalKitMeta().version,
                available: false,
                platform: process.platform,
            };
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(st));
            return;
        }
        if (url.pathname === '/check' && req.method === 'POST') {
            const st = await checkForKitUpdates(true);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(st));
            return;
        }
        if (url.pathname === '/apply' && req.method === 'POST') {
            const result = await applyHotUpdate();
            res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(result));
            return;
        }
        if (url.pathname === '/open-release' && req.method === 'POST') {
            const meta = readLocalKitMeta();
            const target = (updateState && typeof updateState.releaseUrl === 'string' && updateState.releaseUrl.startsWith('https://github.com/'))
                ? updateState.releaseUrl
                : `https://github.com/${meta.repo}/releases/latest`;
            try { await shell.openExternal(target); } catch (_) {}
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, url: target }));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    });
    updaterServer.on('error', () => {
        updaterServer = null;
        updaterPort = null;
    });
    updaterServer.listen(0, '127.0.0.1', () => {
        const addr = updaterServer && updaterServer.address();
        if (addr && typeof addr === 'object') {
            updaterPort = addr.port;
            for (const wc of Array.from(activeContents)) {
                if (wc && !(wc.isDestroyed && wc.isDestroyed())) {
                    wc.executeJavaScript(
                        `window.__agySetUpdater && window.__agySetUpdater(${JSON.stringify(updaterPort)}, ${JSON.stringify(updaterToken)});`,
                        true
                    ).catch(() => {});
                }
            }
        }
    });
}

function parseRuntimeFile() {
    try {
        if (fs.existsSync(TELEMETRY_RUNTIME_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(TELEMETRY_RUNTIME_FILE, 'utf8'));
            const port = Number(parsed && parsed.port);
            const token = typeof (parsed && parsed.token) === 'string' ? parsed.token.trim() : '';
            if (Number.isInteger(port) && port >= 1 && port <= 65535) {
                return { port, token };
            }
        }
    } catch (_) {}

    try {
        if (!fs.existsSync(TELEMETRY_PORT_FILE)) return null;
        const raw = fs.readFileSync(TELEMETRY_PORT_FILE, 'utf8').trim();
        if (!/^\d{1,5}$/.test(raw)) return null;
        const port = Number(raw);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
        return { port, token: '' };
    } catch (_) {
        return null;
    }
}

function checkHealth(port) {
    return new Promise((resolve) => {
        if (!port) { resolve(false); return; }
        let settled = false;
        const done = (ok) => {
            if (settled) return;
            settled = true;
            resolve(ok);
        };
        const req = http.get(
            { hostname: '127.0.0.1', port, path: '/healthz', timeout: 700 },
            (res) => {
                res.resume();
                done(res.statusCode === 200);
            }
        );
        req.on('timeout', () => { req.destroy(); done(false); });
        req.on('error', () => done(false));
    });
}

function pushTelemetryToAll(info) {
    if (!info || !info.port) return;
    const portLit = JSON.stringify(info.port);
    const tokLit = JSON.stringify(info.token || '');
    for (const wc of Array.from(activeContents)) {
        if (!wc || (wc.isDestroyed && wc.isDestroyed())) {
            activeContents.delete(wc);
            continue;
        }
        wc.executeJavaScript(
            `(window.__agySetTelemetry ? window.__agySetTelemetry(${portLit}, ${tokLit}) : (window.__agySetTelemetryPort && window.__agySetTelemetryPort(${portLit})));`,
            true
        ).catch(() => {});
    }
}

function stopRetry() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    retryStep = 0;
}

function scheduleProbe() {
    if (retryTimer || activeContents.size === 0) return;
    if (retryStep >= RETRY_DELAYS.length) return;
    const delay = RETRY_DELAYS[retryStep++];
    retryTimer = setTimeout(async () => {
        retryTimer = null;
        if (activeContents.size === 0) return;
        const candidate = parseRuntimeFile();
        if (candidate && await checkHealth(candidate.port)) {
            knownTelemetry = candidate;
            pushTelemetryToAll(candidate);
            stopRetry();
            return;
        }
        scheduleProbe();
    }, delay);
}

async function refreshTelemetryInfo() {
    const candidate = parseRuntimeFile();
    if (candidate && await checkHealth(candidate.port)) {
        const changed = knownTelemetry.port !== candidate.port || knownTelemetry.token !== candidate.token;
        knownTelemetry = candidate;
        stopRetry();
        if (changed) pushTelemetryToAll(candidate);
        return candidate;
    }
    knownTelemetry = { port: null, token: '' };
    scheduleProbe();
    return { port: null, token: '' };
}

function ensurePortWatcher() {
    if (portWatch) return;
    try {
        if (!fs.existsSync(TELEMETRY_DIR)) return;
        portWatch = fs.watch(TELEMETRY_DIR, { persistent: false }, (_event, filename) => {
            const name = filename ? String(filename) : '';
            if (name && name !== 'runtime.json' && name !== 'port.txt') return;
            if (watchDebounce) clearTimeout(watchDebounce);
            watchDebounce = setTimeout(() => {
                watchDebounce = null;
                void refreshTelemetryInfo();
            }, 300);
        });
        portWatch.on('error', () => {
            try { portWatch.close(); } catch (_) {}
            portWatch = null;
        });
    } catch (_) {
        portWatch = null;
    }
}

exports.attach = function attach(wc) {
    if (!wc || typeof wc !== 'object' || attached.has(wc)) return;
    attached.add(wc);
    activeContents.add(wc);
    ensureIpc();
    ensurePortWatcher();
    ensureUpdaterServer();
    if (!updatePollTimer) {
        updatePollTimer = setInterval(() => {
            if (activeContents.size > 0) void checkForKitUpdates(false);
        }, UPDATE_CHECK_TTL_MS);
        if (typeof updatePollTimer.unref === 'function') updatePollTimer.unref();
    }

    wc.once('destroyed', () => {
        activeContents.delete(wc);
        if (activeContents.size === 0) {
            stopRetry();
            if (watchDebounce) { clearTimeout(watchDebounce); watchDebounce = null; }
            if (portWatch) { try { portWatch.close(); } catch (_) {} portWatch = null; }
            if (updatePollTimer) { clearInterval(updatePollTimer); updatePollTimer = null; }
            if (updaterServer) {
                try { updaterServer.close(); } catch (_) {}
                updaterServer = null;
                updaterPort = null;
            }
        }
    });

    let css = null;
    let js = null;
    let phrases = null;
    let loadedAt = 0;

    function loadAssets() {
        if (css !== null && Date.now() - loadedAt < 3000) return true;
        css = readAsset('theme.css');
        js = readAsset('renderer.js');
        const rawDict = readAsset('localization_dict.json');
        try {
            phrases = rawDict ? JSON.parse(rawDict) : [];
        } catch (error) {
            console.error('[agy-theme] bad localization_dict.json:', error.message);
            phrases = [];
        }
        loadedAt = Date.now();
        return css !== null && js !== null;
    }

    let generation = 0;

    async function mount() {
        const gen = generation;
        if (wc.isDestroyed && wc.isDestroyed()) return;
        if (!loadAssets()) {
            console.error('[agy-theme] assets missing in', assetDirs.join(' | '));
            return;
        }
        try {
            const info = await refreshTelemetryInfo();
            if (gen !== generation) return;
            if (wc.isDestroyed && wc.isDestroyed()) return;
            const kitMeta = readLocalKitMeta();
            await wc.insertCSS(css, { cssOrigin: 'user' });
            if (gen !== generation) return;
            if (wc.isDestroyed && wc.isDestroyed()) return;
            await wc.executeJavaScript(
                `(() => {
                    const AGY_PHRASES = ${JSON.stringify(phrases)};
                    const AGY_TELEMETRY_PORT = ${JSON.stringify(info.port)};
                    const AGY_TELEMETRY_TOKEN = ${JSON.stringify(info.token || '')};
                    const AGY_UPDATER_PORT = ${JSON.stringify(updaterPort)};
                    const AGY_UPDATER_TOKEN = ${JSON.stringify(updaterToken)};
                    const AGY_KIT_META = ${JSON.stringify(kitMeta)};
                    const AGY_UPDATE_STATE = ${JSON.stringify(updateState)};
                    ${js}
                })()`,
                true
            );
            // Trigger non-blocking cached/30m GitHub Release check after window mounts
            void checkForKitUpdates(false);
        } catch (error) {
            console.error('[agy-theme] mount failed:', error && error.message);
        }
    }

    wc.on('dom-ready', () => {
        generation += 1;
        void mount();
    });
};
