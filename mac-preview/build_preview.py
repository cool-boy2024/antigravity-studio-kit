#!/usr/bin/env python3
"""Build an isolated, unsigned Mac preview copy of Antigravity Studio Kit.

Never invokes the Windows installer, signs a bundle, launches an app, copies
user configuration, or writes into /Applications/Antigravity.app. Implements
dual-layer macOS Keychain isolation inside the preview bootstrap:
  1. Chromium's documented --use-mock-keychain switch so Electron OSCrypt never
     touches the user's real login keychain.
  2. An isolated, auto-unlocked $HOME/Library/Keychains/login.keychain-db (with
     an upgrade/re-sign binary-identity ACL guard) so the bundled Go
     language_server (which links Security.framework directly) never triggers
     macOS SecurityAgent "A keychain cannot be found / Reset to Defaults" or
     stale ACL modal prompts, without calling default-keychain or
     list-keychains -s and without modifying ~/Library/Preferences/com.apple.security.plist.
"""

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import pwd
import shutil
import struct
import subprocess
import sys


def real_user_home() -> Path:
    if os.name == 'posix' and os.environ.get('AGY_USE_ENV_HOME') != '1':
        try:
            return Path(pwd.getpwuid(os.getuid()).pw_dir)
        except Exception:
            pass
    return Path.home()


def detect_source_app(explicit=None) -> Path:
    if explicit:
        return Path(explicit).expanduser()
    env_app = os.environ.get('ANTIGRAVITY_APP_PATH', '').strip()
    if env_app:
        return Path(env_app).expanduser()
    for candidate in (Path('/Applications/Antigravity.app'), USER_HOME / 'Applications' / 'Antigravity.app'):
        if candidate.is_dir() and not candidate.is_symlink():
            return candidate
    return Path('/Applications/Antigravity.app')


HERE = Path(__file__).resolve().parent
KIT = HERE.parent
USER_HOME = real_user_home()
SOURCE = detect_source_app()
DEFAULT_DESTINATION = USER_HOME / 'Applications' / 'Antigravity Community Preview.app'
STAGED_DESTINATION = USER_HOME / 'Applications' / 'Antigravity Community Preview.app.staged'
PREVIEW_BASE = USER_HOME / 'Library' / 'Application Support' / 'Antigravity Community Preview'
OUTPUT = HERE / 'output'
APP_NAME = 'Antigravity Community Preview'
BUNDLE_ID = 'com.community.antigravity-preview'


def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        while True:
            chunk = handle.read(1048576)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def tree_hash(root):
    """Read content and symlink names, without following symlinked directories."""
    digest = hashlib.sha256()
    count = 0
    for directory, subdirs, files in os.walk(root, followlinks=False):
        subdirs.sort()
        files.sort()
        for name in list(subdirs):
            item = Path(directory) / name
            if item.is_symlink():
                files.append(name)
                subdirs.remove(name)
        for name in sorted(files):
            item = Path(directory) / name
            relative = item.relative_to(root).as_posix()
            digest.update(relative.encode('utf-8') + b'\0')
            if item.is_symlink():
                digest.update(b'link\0' + os.readlink(item).encode('utf-8') + b'\0')
            elif item.is_file():
                digest.update(b'file\0' + file_hash(item).encode('ascii') + b'\0')
            else:
                raise RuntimeError(f'Unsupported source bundle entry: {relative}')
            count += 1
    return {'sha256': digest.hexdigest(), 'entries': count}


def replace_once(source, old, new, anchor, anchors, optional=False):
    count = source.count(old)
    anchors[anchor] = count
    if count != 1:
        if optional and count == 0:
            print(f'[warn] optional anchor not present in this Antigravity version: {anchor}', file=sys.stderr)
            return source
        raise RuntimeError(f'{anchor}: expected exactly one anchor, found {count}')
    return source.replace(old, new, 1)


def asar_text(raw, header, base, relative):
    item = header
    for part in relative.split('/'):
        item = item['files'][part]
    if item.get('unpacked'):
        raise RuntimeError(f'Expected packed source: {relative}')
    offset = base + int(item['offset'])
    return raw[offset:offset + item['size']].decode('utf-8')


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-app', help='Path to official Antigravity.app (default: auto-detect /Applications or ~/Applications)')
    parser.add_argument('--dry-run', action='store_true', help='Validate paths and patch anchors; write nothing')
    parser.add_argument('--rebuild', action='store_true', help='Replace an existing preview bundle (refuses if running)')
    parser.add_argument('--stage', action='store_true', help='Build into .app.staged so a running preview stays untouched')
    parser.add_argument('--no-pulse', action='store_true', help='Disable local token-authenticated gemini-pulse telemetry discovery')
    args = parser.parse_args()

    if sys.platform != 'darwin':
        raise SystemExit('This builder is only for macOS.')

    source = detect_source_app(args.source_app)
    if source.is_symlink() or source.resolve() != source:
        raise SystemExit(f'Official source app must be a real .app directory: {source}')
    if not source.is_dir():
        raise SystemExit(f'Official Antigravity.app not found: {source} (install Antigravity first or pass --source-app)')

    destination = STAGED_DESTINATION if args.stage else DEFAULT_DESTINATION

    if destination.resolve() == source or destination.parent.resolve() == source or source in destination.resolve().parents:
        raise SystemExit('Preview destination must not be inside or equal to the official app.')
    if OUTPUT.is_symlink() or source in OUTPUT.resolve().parents:
        raise SystemExit('Build output must be a real directory outside the official app.')
    for preview_path in [PREVIEW_BASE, PREVIEW_BASE / 'Home', PREVIEW_BASE / 'UserData']:
        if preview_path.is_symlink():
            raise SystemExit(f'Preview data path must not be a symlink: {preview_path}')

    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('community_upstream_patcher', KIT / 'injector' / 'patch_asar_stable.py')
    patcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patcher)

    if destination.exists() or destination.is_symlink():
        if not args.dry_run and not args.stage and not args.rebuild:
            raise SystemExit(
                f'Refusing to overwrite an existing preview: {destination} '
                '(pass --rebuild after quitting Preview, or --stage while running)'
            )
        if not args.dry_run and not args.stage and patcher.antigravity_running(str(destination)):
            raise SystemExit(
                f'{destination.name} is currently running. Quit it before --rebuild, or use --stage.'
            )

    original_asar = source / 'Contents' / 'Resources' / 'app.asar'
    patcher.RES = str(original_asar.parent)
    problems = patcher.verify(str(original_asar))
    if problems:
        raise SystemExit(f'Official ASAR failed existing upstream checks: {problems[0]}')
    raw, header, base = patcher.read_asar(str(original_asar))
    original_plist = plistlib.loads((source / 'Contents' / 'Info.plist').read_bytes())
    if original_plist.get('CFBundleExecutable') != 'Antigravity':
        raise SystemExit('Expected original CFBundleExecutable=Antigravity; refusing to rename or guess.')
    critical_paths = ['Contents/MacOS/Antigravity', 'Contents/Info.plist', 'Contents/Resources/app.asar']
    original_critical_before = {name: file_hash(source / name) for name in critical_paths}
    anchors = {}
    patches = patcher.build_patches(str(original_asar))

    custom = (KIT / 'injector' / 'custom-theme-main.js').read_text(encoding='utf-8')
    if args.no_pulse:
        port_start = custom.index('async function refreshTelemetryInfo() {')
        watch_end = custom.index('\nexports.attach = function attach(wc) {', port_start)
        anchors['telemetry_functions_disabled'] = 1
        custom = custom[:port_start] + (
            '// Community Mac preview (--no-pulse): telemetry discovery disabled.\n'
            'async function refreshTelemetryInfo() { return { port: null, token: "" }; }\n'
            'function ensurePortWatcher() {}\n'
        ) + custom[watch_end:]
    else:
        anchors['telemetry_token_auth_enabled'] = 1
    patches[patcher.THEME_FILE] = custom

    main_js = asar_text(raw, header, base, 'dist/main.js')
    bootstrap = r'''const electron_1 = require("electron");
// [community-mac-preview] Isolate all preview paths and avoid macOS Keychain prompts before importing app modules.
const __previewFs = require('node:fs');
const __previewPath = require('node:path');
const __previewRawHome = process.env.AGY_COMMUNITY_PREVIEW_REAL_HOME || require('node:os').homedir();
const __previewHomeSuffix = __previewPath.join('Library', 'Application Support', 'Antigravity Community Preview', 'Home');
const __previewBase = process.env.AGY_COMMUNITY_PREVIEW_BASE || (
    __previewRawHome.endsWith(__previewHomeSuffix)
        ? __previewPath.dirname(__previewRawHome)
        : __previewPath.join(__previewRawHome, 'Library', 'Application Support', 'Antigravity Community Preview')
);
const __previewHome = __previewPath.join(__previewBase, 'Home');
const __previewUserData = __previewPath.join(__previewBase, 'UserData');
const __previewLogs = __previewPath.join(__previewBase, 'Logs');
for (const __directory of [__previewHome, __previewUserData, __previewLogs]) {
    __previewFs.mkdirSync(__directory, {recursive: true, mode: 0o700});
}
process.env.AGY_COMMUNITY_PREVIEW_BASE = __previewBase;
process.env.HOME = __previewHome;
process.env.AGY_COMMUNITY_PREVIEW_HOME = __previewHome;
process.env.XDG_CONFIG_HOME = __previewPath.join(__previewHome, '.config');
process.env.XDG_DATA_HOME = __previewPath.join(__previewHome, '.local', 'share');
// Layer 1: Prevent Chromium/Electron OSCrypt from touching macOS Keychain.
electron_1.app.commandLine.appendSwitch('use-mock-keychain');
// Layer 2: Bootstrap an isolated, auto-unlocked login.keychain-db under __previewHome/Library/Keychains/
// so the Go language_server (which links Security.framework directly) never triggers SecurityAgent
// "A keychain cannot be found / Reset to Defaults" or stale ad-hoc ACL modal prompts.
function __ensurePreviewKeychain() {
    if (process.platform !== 'darwin') {
        return;
    }
    try {
        const __cp = require('node:child_process');
        const __kcDir = __previewPath.join(__previewHome, 'Library', 'Keychains');
        const __kcPath = __previewPath.join(__kcDir, 'login.keychain-db');
        const __kcStampPath = __previewPath.join(__kcDir, '.ls-binary-stamp');
        __previewFs.mkdirSync(__kcDir, {recursive: true, mode: 0o700});

        const __runSecurity = (args) => {
            try {
                __cp.execFileSync('/usr/bin/security', args, {
                    env: process.env,
                    stdio: 'ignore',
                    timeout: 4000,
                });
                return true;
            } catch {
                return false;
            }
        };

        const __lsBin = process.resourcesPath
            ? __previewPath.join(process.resourcesPath, 'bin', 'language_server')
            : '';
        let __appVer = '';
        try { __appVer = String(electron_1.app.getVersion() || ''); } catch {}
        let __lsSize = -1;
        let __lsMtimeMs = -1;
        if (__lsBin) {
            try {
                const __st = __previewFs.statSync(__lsBin);
                __lsSize = __st.size;
                __lsMtimeMs = Math.trunc(__st.mtimeMs);
            } catch {}
        }

        const __readCdHash = () => {
            if (!__lsBin || __lsSize < 0) {
                return '';
            }
            try {
                const __res = __cp.spawnSync('/usr/bin/codesign', ['-d', '--verbose=4', __lsBin], {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                    timeout: 2500,
                });
                if (__res && __res.status === 0) {
                    const __out = `${__res.stderr || ''}\n${__res.stdout || ''}`;
                    const __m = __out.match(/^CDHash=([0-9a-fA-F]+)/m);
                    if (__m) {
                        return __m[1].toLowerCase();
                    }
                }
            } catch {}
            return '';
        };

        let __stampExists = false;
        let __storedStamp = null;
        try {
            const __rawStamp = __previewFs.readFileSync(__kcStampPath, 'utf8').trim();
            __stampExists = true;
            if (__rawStamp) {
                __storedStamp = JSON.parse(__rawStamp);
            }
        } catch {}

        const __writeStamp = (cdhash) => {
            try {
                const __payload = JSON.stringify({
                    version: __appVer,
                    size: __lsSize,
                    mtimeMs: __lsMtimeMs,
                    cdhash: cdhash || '',
                });
                __previewFs.writeFileSync(__kcStampPath, `${__payload}\n`, {encoding: 'utf8', mode: 0o600});
            } catch {}
        };

        const __purgeStaleKeychain = () => {
            try {
                for (const __entry of __previewFs.readdirSync(__kcDir)) {
                    if (
                        __entry === 'login.keychain-db' ||
                        __entry.startsWith('login.keychain-db-') ||
                        __entry.startsWith('.fl')
                    ) {
                        try {
                            __previewFs.unlinkSync(__previewPath.join(__kcDir, __entry));
                        } catch {}
                    }
                }
            } catch {}
        };

        let __kcExists = false;
        try {
            __kcExists = __previewFs.lstatSync(__kcPath).isFile();
        } catch {}

        let __currentCdHash = null;
        const __getCdHash = () => {
            if (__currentCdHash === null) {
                __currentCdHash = __readCdHash();
            }
            return __currentCdHash;
        };

        let __stampChanged = false;
        let __stampNeedsUpdate = false;
        if (__kcExists && __stampExists) {
            if (__storedStamp && typeof __storedStamp === 'object') {
                const __fastMatch =
                    __storedStamp.version === __appVer &&
                    __storedStamp.size === __lsSize &&
                    __storedStamp.mtimeMs === __lsMtimeMs;
                if (!__fastMatch) {
                    const __curHash = __getCdHash();
                    if (__storedStamp.cdhash && __curHash && __storedStamp.cdhash === __curHash) {
                        __stampNeedsUpdate = true;
                    } else {
                        __stampChanged = true;
                    }
                }
            } else {
                __stampChanged = true;
            }
        } else if (__kcExists && !__stampExists) {
            __stampNeedsUpdate = true;
        }

        const __createFresh = () => {
            __purgeStaleKeychain();
            // Never call default-keychain or list-keychains -s; Security.framework
            // automatically resolves $HOME/Library/Keychains/login.keychain-db without
            // modifying the user's real ~/Library/Preferences/com.apple.security.plist.
            if (!__runSecurity(['create-keychain', '-p', '', __kcPath])) {
                if (!__previewFs.existsSync(__kcPath)) {
                    return;
                }
            }
            __runSecurity(['set-keychain-settings', __kcPath]);
            __runSecurity(['unlock-keychain', '-p', '', __kcPath]);
            try { __previewFs.chmodSync(__kcPath, 0o600); } catch {}
            __writeStamp(__getCdHash());
        };

        if (!__kcExists || __stampChanged) {
            __createFresh();
        } else if (!__runSecurity(['unlock-keychain', '-p', '', __kcPath])) {
            __createFresh();
        } else {
            __runSecurity(['set-keychain-settings', __kcPath]);
            try { __previewFs.chmodSync(__kcPath, 0o600); } catch {}
            if (__stampNeedsUpdate) {
                __writeStamp(__getCdHash());
            }
        }
    } catch {}
}
__ensurePreviewKeychain();
electron_1.app.setName('Antigravity Community Preview');
electron_1.app.setPath('home', __previewHome);
electron_1.app.setPath('userData', __previewUserData);
electron_1.app.setPath('logs', __previewLogs);
'''
    main_js = replace_once(main_js, 'const electron_1 = require("electron");\n', bootstrap,
                           'early_home_userdata_and_mock_keychain', anchors)
    protocol_registration = '''if (!electron_1.app.isDefaultProtocolClient(PROTOCOL, ...protocolClientArgs)) {
    electron_1.app.setAsDefaultProtocolClient(PROTOCOL, ...protocolClientArgs);
}'''
    main_js = replace_once(main_js, protocol_registration,
        '// [community-mac-preview] Never claim the official OAuth URL protocol.',
        'skip_os_protocol_registration', anchors, optional=True)
    main_js = replace_once(main_js,
        '        await (0, ideInstall_1.maybeShowIdeInstallWizard)(storageManager);',
        '        // [community-mac-preview] Do not inspect/copy official IDE data.',
        'skip_ide_migration_wizard', anchors, optional=True)
    main_js = replace_once(main_js,
        '    (0, updater_1.initAutoUpdater)(HEADLESS, settingsService);',
        '    // [community-mac-preview] Automatic updater disabled for this local copy.',
        'skip_auto_updater', anchors, optional=True)
    patches['dist/main.js'] = main_js

    ls_js = asar_text(raw, header, base, 'dist/languageServer.js')
    ls_js = replace_once(ls_js,
        '        const env = { ...process.env, ...loginShellEnv };',
        '''        const env = { ...process.env, ...loginShellEnv };
        // [community-mac-preview] Login-shell output must not restore the real HOME.
        env.HOME = process.env.HOME;
        env.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
        env.XDG_DATA_HOME = process.env.XDG_DATA_HOME;''',
        'language_server_home_isolation', anchors)
    patches['dist/languageServer.js'] = ls_js

    assets = {
        'theme.css': KIT / 'theme' / 'dist' / 'theme.css',
        'renderer.js': KIT / 'theme' / 'dist' / 'renderer.js',
        'localization_dict.json': KIT / 'theme' / 'localization_dict.json',
        'kit-meta.json': KIT / 'theme' / 'kit-meta.json',
    }
    for item in assets.values():
        if not item.is_file() or item.is_symlink():
            raise SystemExit(f'Missing or unexpected visual asset: {item}')

    report_path = OUTPUT / ('build-report-staged.json' if args.stage else 'build-report.json')
    plan = {
        'mode': 'dry-run' if args.dry_run else ('stage-build' if args.stage else 'build'),
        'staged': bool(args.stage),
        'source_app': str(source),
        'destination_app': str(destination),
        'source_version': original_plist.get('CFBundleShortVersionString'),
        'preview_home': str(PREVIEW_BASE / 'Home'),
        'preview_user_data': str(PREVIEW_BASE / 'UserData'),
        'bundle_id': BUNDLE_ID,
        'mock_keychain_enabled': True,
        'isolated_login_keychain_bootstrap': True,
        'quota_backend_enabled': not args.no_pulse,
        'quota_token_auth': not args.no_pulse,
        'patched_asar_files': sorted(patches),
        'anchors': anchors,
        'visual_assets': {name: file_hash(item) for name, item in assets.items()},
        'user_configuration_copied': False,
        'signing_performed': False,
        'launch_performed': False,
        'original_source_asar_sha256': file_hash(original_asar),
        'original_critical_before': original_critical_before,
        'cf_bundle_executable': original_plist['CFBundleExecutable'],
    }
    if args.dry_run:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0

    OUTPUT.mkdir(parents=True, exist_ok=True)
    source_before = tree_hash(source)
    write_json(report_path, {**plan, 'status': 'building', 'source_tree_before': source_before})

    if destination.is_symlink():
        destination.unlink()
    elif destination.exists():
        shutil.rmtree(destination)

    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['/usr/bin/ditto', str(source), str(destination)], check=True)
    destination_asar = destination / 'Contents' / 'Resources' / 'app.asar'
    patcher.RES = str(destination_asar.parent)
    staged_main = OUTPUT / 'custom-theme-main.js'
    staged_main.write_text(custom, encoding='utf-8')
    patcher.MAIN_JS_SRC = str(staged_main)
    copied_patches = patcher.build_patches(str(destination_asar))
    copied_patches.update(patches)
    temporary_asar = destination_asar.with_name('app.asar.community-preview.tmp')
    patcher.apply_patches(str(destination_asar), copied_patches, str(temporary_asar))
    problems = patcher.verify(str(temporary_asar))
    if problems:
        raise RuntimeError(f'Preview candidate failed upstream verification: {problems[0]}')
    os.replace(temporary_asar, destination_asar)
    asset_dir = destination_asar.parent / 'community-preview-assets'
    asset_dir.mkdir(exist_ok=True)
    for name, item in assets.items():
        shutil.copyfile(item, asset_dir / name)

    with destination_asar.open('rb') as handle:
        prefix = handle.read(16)
        json_length = struct.unpack('<I', prefix[12:16])[0]
        header_hash = hashlib.sha256(handle.read(json_length)).hexdigest()
    plist_file = destination / 'Contents' / 'Info.plist'
    metadata = plistlib.loads(plist_file.read_bytes())
    metadata['CFBundleIdentifier'] = BUNDLE_ID
    metadata['CFBundleName'] = original_plist['CFBundleName']
    metadata['CFBundleDisplayName'] = APP_NAME
    metadata.pop('CFBundleURLTypes', None)
    metadata.setdefault('ElectronAsarIntegrity', {})['Resources/app.asar'] = {'algorithm': 'SHA256', 'hash': header_hash}
    plist_file.write_bytes(plistlib.dumps(metadata, fmt=plistlib.FMT_XML, sort_keys=False))

    signature = subprocess.run(['/usr/bin/codesign', '-d', '--entitlements', ':-', str(source)],
                               check=True, capture_output=True)
    entitlements = plistlib.loads(signature.stdout) if signature.stdout.strip() else {}
    entitlements_path = OUTPUT / 'main-entitlements.plist'
    if entitlements_path.is_symlink():
        raise RuntimeError('Entitlements output path must not be a symlink')
    entitlements_path.write_bytes(plistlib.dumps(entitlements, fmt=plistlib.FMT_XML))

    source_after = tree_hash(source)
    original_critical_after = {name: file_hash(source / name) for name in critical_paths}
    if source_after != source_before or original_critical_after != original_critical_before:
        raise RuntimeError('Official app content changed during preview build; inspect before continuing')

    bundle_name = original_plist['CFBundleName']
    report = {
        **plan,
        'status': 'built-awaiting-local-signature',
        'source_tree_before': source_before,
        'source_tree_after': source_after,
        'original_critical_after': original_critical_after,
        'original_app_unchanged': True,
        'preview_asar_sha256': file_hash(destination_asar),
        'preview_asar_header_sha256': header_hash,
        'preview_plist_sha256': file_hash(plist_file),
        'entitlements_path': str(entitlements_path),
        'internal_cf_bundle_name': bundle_name,
        'native_helper_path_verified': str(destination / 'Contents' / 'Frameworks' / f'{bundle_name} Helper.app' / 'Contents' / 'MacOS' / f'{bundle_name} Helper'),
    }
    write_json(report_path, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'Preview build stopped: {exc}', file=sys.stderr)
        sys.exit(1)
