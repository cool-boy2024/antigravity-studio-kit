#!/usr/bin/env python3
"""Locally ad-hoc-sign only the fixed, independently built preview app (or staged copy).

Signs every real Mach-O first, then nested app/framework bundles from the
inside out, and finally the outer app. This isolated development preview uses
ad-hoc signatures with options 0 instead of the vendor's hardened-runtime
signature mode. It preserves existing entitlements and does not add library-
validation exceptions, change Electron fuses, disable system Gatekeeper/SIP,
launch applications, or write to the original app.
"""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import plistlib
import pwd
import re
import struct
import subprocess
import sys

sys.dont_write_bytecode = True
from build_preview import detect_source_app, file_hash, tree_hash


def real_user_home() -> Path:
    if os.name == 'posix' and os.environ.get('AGY_USE_ENV_HOME') != '1':
        try:
            return Path(pwd.getpwuid(os.getuid()).pw_dir)
        except Exception:
            pass
    return Path.home()


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / 'output'
USER_HOME = real_user_home()
DEFAULT_TARGET = USER_HOME / 'Applications' / 'Antigravity Community Preview.app'
STAGED_TARGET = USER_HOME / 'Applications' / 'Antigravity Community Preview.app.staged'
BUNDLE_ID = 'com.community.antigravity-preview'
CRITICAL = ('Contents/MacOS/Antigravity', 'Contents/Info.plist', 'Contents/Resources/app.asar')
MACH_MAGICS = {b'\xfe\xed\xfa\xce', b'\xce\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'\xcf\xfa\xed\xfe'}
FAT_MAGICS = {b'\xca\xfe\xba\xbe': '>', b'\xbe\xba\xfe\xca': '<', b'\xca\xfe\xba\xbf': '>', b'\xbf\xba\xfe\xca': '<'}


def read_json_regular(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 1024 * 1024:
        raise RuntimeError(f'Expected a small regular JSON record: {path}')
    return json.loads(path.read_text(encoding='utf-8'))


def mach_o(path):
    with path.open('rb') as handle:
        header = handle.read(8)
        if header[:4] in MACH_MAGICS:
            return True
        endian = FAT_MAGICS.get(header[:4])
        if not endian or len(header) < 8:
            return False
        count = struct.unpack(endian + 'I', header[4:8])[0]
        wide = header[:4] in {b'\xca\xfe\xba\xbf', b'\xbf\xba\xfe\xca'}
        record_size = 32 if wide else 20
        if count < 1 or count > 64:
            return False
        records = handle.read(count * record_size)
        if len(records) != count * record_size:
            return False
        size = path.stat().st_size
        for index in range(count):
            item = records[index * record_size:(index + 1) * record_size]
            cpu = struct.unpack(endian + 'I', item[:4])[0]
            offset, length = struct.unpack(endian + ('QQ' if wide else 'II'), item[8:24] if wide else item[8:16])
            if cpu not in {7, 12, 18, 0x01000007, 0x0100000C, 0x01000012} or offset < 8 + len(records) or length == 0 or offset + length > size:
                return False
        return True


def inventory(target):
    binaries = []
    bundles = []
    for directory, subdirs, files in os.walk(target, followlinks=False):
        subdirs[:] = sorted(name for name in subdirs if not (Path(directory) / name).is_symlink())
        current = Path(directory)
        if current != target and current.suffix in {'.app', '.framework'}:
            bundles.append(current)
        for name in sorted(files):
            item = current / name
            if item.is_symlink() or not item.is_file():
                continue
            resolved = item.resolve()
            if target not in resolved.parents:
                raise RuntimeError('A binary path escaped the preview bundle')
            if mach_o(item):
                binaries.append(item)
    binaries.sort(key=lambda item: item.relative_to(target).as_posix())
    bundles.sort(key=lambda item: (len(item.parts), item.as_posix()), reverse=True)
    return binaries, bundles


def metadata(path):
    details = subprocess.run(['/usr/bin/codesign', '-d', '--verbose=4', str(path)], capture_output=True, text=True)
    if details.returncode != 0:
        return {'signed': False, 'flags': None, 'entitlements': {}}
    match = re.search(r'\bflags=(0x[0-9a-fA-F]+)', details.stderr)
    flags = int(match.group(1), 16) if match else None
    captured = subprocess.run(['/usr/bin/codesign', '-d', '--entitlements', ':-', str(path)], capture_output=True)
    raw = captured.stdout.strip()
    entitlements = plistlib.loads(raw) if raw else {}
    return {'signed': True, 'flags': flags, 'entitlements': entitlements}


def sign_one(path, target):
    before = metadata(path)
    command = ['/usr/bin/codesign', '--force', '--sign', '-', '--options', '0', '--preserve-metadata=entitlements', str(path)]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'codesign failed for {path.name}: {result.stderr.strip()}')
    after = metadata(path)
    if after['entitlements'] != before['entitlements']:
        raise RuntimeError(f'Entitlements changed while signing {path}')
    if after['flags'] is None or after['flags'] & ~0x2:
        raise RuntimeError(f'Unexpected development signing flags for {path}')
    return {'path': str(path.relative_to(target)), 'flags_before': before['flags'], 'flags_after': after['flags'], 'entitlements_preserved': True, 'hardened_runtime': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-app', help='Path to official Antigravity.app (default: read from build report / auto-detect)')
    parser.add_argument('--dry-run', action='store_true', help='Check guards and list signing order without modifying files')
    parser.add_argument('--stage', action='store_true', help='Sign the staged preview bundle (.app.staged)')
    args = parser.parse_args()

    if sys.platform != 'darwin':
        raise SystemExit('This signer is only for macOS.')

    target = STAGED_TARGET if args.stage else DEFAULT_TARGET
    build_report = OUTPUT / ('build-report-staged.json' if args.stage else 'build-report.json')
    signing_report = OUTPUT / ('signing-report-staged.json' if args.stage else 'signing-report.json')

    build = read_json_regular(build_report)
    source = detect_source_app(args.source_app or build.get('source_app'))

    if source.is_symlink() or source.resolve() != source or not source.is_dir():
        raise SystemExit(f'Official source app must be a real .app directory: {source}')
    if target.is_symlink() or not target.is_dir() or target.resolve() != target or source in target.parents:
        raise SystemExit(f'Expected the independent, non-symlink preview app at {target}.')
    if OUTPUT.is_symlink() or not OUTPUT.is_dir() or source in OUTPUT.resolve().parents:
        raise SystemExit('Output directory must be outside the original app and not a symlink.')
    if signing_report.is_symlink():
        raise SystemExit('Signing report must not be a symlink.')
    info_path = target / 'Contents' / 'Info.plist'
    if info_path.is_symlink():
        raise SystemExit('Preview Info.plist must not be a symlink.')
    info = plistlib.loads(info_path.read_bytes())
    if info.get('CFBundleIdentifier') != BUNDLE_ID or info.get('CFBundleExecutable') != 'Antigravity':
        raise SystemExit('Preview bundle ID or executable identity does not match this builder.')
    if build.get('source_app') != str(source) or build.get('destination_app') != str(target) or build.get('bundle_id') != BUNDLE_ID:
        raise SystemExit('Build report does not describe this exact preview and original app.')
    expected = build.get('original_critical_before')
    if not isinstance(expected, dict) or set(expected) != set(CRITICAL) or any(not isinstance(value, str) or not re.fullmatch('[0-9a-f]{64}', value) for value in expected.values()):
        raise SystemExit('Build report has no complete original-file hash guard.')
    current = {name: file_hash(source / name) for name in CRITICAL}
    if current != expected or build.get('original_critical_after') != expected:
        raise SystemExit('Original app no longer matches the verified build record; refusing to sign.')
    if file_hash(target / 'Contents' / 'Resources' / 'app.asar') != build.get('preview_asar_sha256'):
        raise SystemExit('Preview ASAR no longer matches the verified build record.')
    binaries, bundles = inventory(target)
    if not binaries:
        raise SystemExit('No Mach-O binaries found in the preview.')
    plan = {
        'source_app': str(source),
        'target_app': str(target),
        'staged': bool(args.stage),
        'bundle_id': BUNDLE_ID,
        'binary_count': len(binaries),
        'nested_bundle_count': len(bundles),
        'order': [str(item.relative_to(target)) for item in binaries + bundles] + ['.'],
        'original_critical_before': current,
        'preserve_metadata': ['entitlements'],
        'signing_options': 0,
        'hardened_runtime': False,
        'development_preview': True,
        'added_library_validation_exceptions': False,
        'fuses_modified': False,
        'launch_performed': False,
    }
    if args.dry_run:
        print(json.dumps({'mode': 'dry-run', **plan}, ensure_ascii=False, indent=2))
        return 0
    source_tree_before = tree_hash(source)
    if source_tree_before != build.get('source_tree_before'):
        raise SystemExit('Original app tree differs from the build report; refusing to sign.')
    signed = []
    report = {'mode': 'sign', **plan, 'started_at': datetime.now(timezone.utc).isoformat(), 'source_tree_before': source_tree_before}
    failure = None
    try:
        for item in binaries + bundles + [target]:
            signed.append(sign_one(item, target))
        verified = subprocess.run(['/usr/bin/codesign', '--verify', '--deep', '--strict', '--verbose=2', str(target)], capture_output=True, text=True)
        report['strict_verification'] = {'returncode': verified.returncode, 'output': verified.stderr.strip()}
        if verified.returncode:
            raise RuntimeError('Preview failed strict signature verification')
        report['status'] = 'signed-and-strictly-verified'
    except Exception as exc:
        failure = exc
        report['status'] = 'signing-stopped'
        report['error'] = str(exc)
    finally:
        report['signed_objects'] = signed
        report['finished_at'] = datetime.now(timezone.utc).isoformat()
        report['original_critical_after'] = {name: file_hash(source / name) for name in CRITICAL}
        report['source_tree_after'] = tree_hash(source)
        report['original_app_unchanged'] = report['original_critical_after'] == current and report['source_tree_after'] == source_tree_before
        if not report['original_app_unchanged']:
            report['status'] = 'original-content-changed-during-signing'
            failure = RuntimeError('Original app content changed during signing; investigate before launching')
        temporary = OUTPUT / f'{signing_report.name}.tmp.{os.getpid()}'
        with temporary.open('x', encoding='utf-8') as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(temporary, signing_report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if failure:
        raise failure
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'Preview signing stopped: {exc}', file=sys.stderr)
        sys.exit(1)
