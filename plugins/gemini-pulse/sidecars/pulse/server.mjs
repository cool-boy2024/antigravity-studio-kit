import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildContextMeta,
  buildFullTelemetryPayload,
  getInlineSideAskStatus,
  saveSettings,
  startInlineSideAsk
} from "./telemetry.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const UI_HTML_PATH = join(SELF_DIR, "ui.html");
const PORT = Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || 0);
const LOCAL_PORT_FILE = join(SELF_DIR, "port.txt");
const LOCAL_RUNTIME_FILE = join(SELF_DIR, "runtime.json");

const AUTH_TOKEN = randomBytes(24).toString("hex");
const AUTH_TOKEN_BUF = Buffer.from(AUTH_TOKEN, "utf8");
const ALLOWED_ORIGIN_RE = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/i;
const ALLOWED_HOST_RE = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/i;
const INLINE_ASK_ID_RE = /^[0-9a-f-]{36}$/i;

let boundPort = 0;

function publishRuntime(actualPort) {
  boundPort = actualPort;
  const payload = JSON.stringify({
    port: actualPort,
    token: AUTH_TOKEN,
    pid: process.pid,
    startedAt: new Date().toISOString()
  });
  try {
    const tmp = LOCAL_RUNTIME_FILE + `.tmp.${process.pid}`;
    writeFileSync(tmp, payload + "\n", { encoding: "utf8", mode: 0o600 });
    if (process.platform !== "win32") {
      try { chmodSync(tmp, 0o600); } catch {}
    }
    try {
      renameSync(tmp, LOCAL_RUNTIME_FILE);
    } catch {
      // On Windows, concurrent watcher reads can briefly lock renameSync; fall back cleanly.
      writeFileSync(LOCAL_RUNTIME_FILE, payload + "\n", { encoding: "utf8", mode: 0o600 });
      try { unlinkSync(tmp); } catch {}
    }
  } catch {}
  try {
    writeFileSync(LOCAL_PORT_FILE, String(actualPort), { encoding: "utf8", mode: 0o600 });
  } catch {}
}

function cleanupRuntime() {
  for (const file of [LOCAL_RUNTIME_FILE, LOCAL_PORT_FILE]) {
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {}
  }
}

function isValidToken(candidate) {
  if (typeof candidate !== "string" || !candidate) return false;
  const buf = Buffer.from(candidate, "utf8");
  if (buf.length !== AUTH_TOKEN_BUF.length) return false;
  return timingSafeEqual(buf, AUTH_TOKEN_BUF);
}

function isLoopbackHost(hostHeader) {
  const host = String(hostHeader || "").trim();
  if (!host || !ALLOWED_HOST_RE.test(host)) return false;
  if (boundPort > 0 && host.includes(":")) {
    const m = host.match(/:(\d{1,5})$/);
    if (m && Number(m[1]) !== boundPort) return false;
  }
  return true;
}

function applySecurityHeaders(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Vary", "Origin");

  const origin = req.headers.origin;
  if (typeof origin === "string" && ALLOWED_ORIGIN_RE.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Gemini-Pulse-Token");
    return true;
  }
  return !origin;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let len = 0;
    req.on("data", (c) => {
      len += c.length;
      if (len < 131072) chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

async function handleRequest(req, res) {
  if (!isLoopbackHost(req.headers.host)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("forbidden host");
    return;
  }

  const originAllowed = applySecurityHeaders(req, res);
  if (!originAllowed) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("forbidden origin");
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("ok");
    return;
  }

  const headerTok = String(req.headers["x-gemini-pulse-token"] || "").trim();
  const queryTok = url.searchParams.get("token") || "";
  if (!isValidToken(headerTok) && !isValidToken(queryTok)) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  if (url.pathname === "/api/settings" && req.method === "POST") {
    const body = await readJsonBody(req);
    const saved = saveSettings(body);
    const payload = await buildFullTelemetryPayload({ convId: body.conv || "auto", forceQuota: false, compact: false });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, settings: saved, payload }));
    return;
  }

  if (url.pathname === "/api/context-meta" && req.method === "GET") {
    const convId = url.searchParams.get("conv") || "auto";
    const includeLatest = url.searchParams.get("includeLatest") === "1";
    const meta = buildContextMeta({ convId, includeLatest });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(meta));
    return;
  }

  if (url.pathname === "/api/inline-ask" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = await startInlineSideAsk(body);
    res.writeHead(result.ok ? 200 : (result.statusCode || 400), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === "/api/inline-ask/status" && req.method === "GET") {
    const id = String(url.searchParams.get("id") || "").trim();
    if (!INLINE_ASK_ID_RE.test(id)) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: false, error: "invalid_ask_id" }));
      return;
    }
    const status = await getInlineSideAskStatus(id);
    res.writeHead(status.ok ? 200 : (status.statusCode || 400), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(status));
    return;
  }

  if (url.pathname === "/api/metrics") {
    const convId = url.searchParams.get("conv") || "auto";
    const forceQuota = url.searchParams.get("refresh") === "1";
    const compact = url.searchParams.get("view") === "compact";
    const payload = await buildFullTelemetryPayload({ convId, forceQuota, compact });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(payload));
    return;
  }

  if (url.pathname === "/api/events") {
    const convId = url.searchParams.get("conv") || "auto";
    const compact = url.searchParams.get("view") === "compact";
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive"
    });

    let closed = false;
    let lastSig = "";

    const pushUpdate = async () => {
      if (closed) return;
      try {
        const payload = await buildFullTelemetryPayload({ convId, forceQuota: false, compact });
        if (closed) return;
        const ap = payload.quota?.activePool;
        const sig = JSON.stringify([
          payload.activeConversationId,
          payload.metrics?.steps,
          payload.metrics?.turns,
          payload.metrics?.cumulativeTokens,
          payload.metrics?.contextLimit,
          payload.metrics?.contextPct,
          payload.settings?.capMode,
          payload.quota?.fetchedAt,
          payload.quota?.account,
          ap?.window5h?.remainingPct,
          ap?.windowWeekly?.remainingPct,
          compact ? 1 : (payload.trend7d?.totals?.tokens || 0)
        ]);
        if (sig !== lastSig) {
          lastSig = sig;
          res.write("data: " + JSON.stringify(payload) + "\n\n");
        }
      } catch {}
    };

    void pushUpdate();
    const timer = setInterval(() => { void pushUpdate(); }, compact ? 2000 : 1500);
    req.on("close", () => {
      closed = true;
      clearInterval(timer);
    });
    return;
  }

  // Serve UI HTML fresh from disk for zero-restart UI iteration
  try {
    const html = existsSync(UI_HTML_PATH) ? readFileSync(UI_HTML_PATH, "utf8") : "<h1>UI missing</h1>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(err?.message || err));
  }
}

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    cleanupRuntime();
    try { server.close(); } catch {}
    process.exit(0);
  });
}
process.on("exit", cleanupRuntime);

server.listen(PORT, "127.0.0.1", () => {
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : PORT;
  publishRuntime(actualPort);
  console.log(`[gemini-pulse] listening on http://127.0.0.1:${actualPort} (token auth enabled)`);
});
