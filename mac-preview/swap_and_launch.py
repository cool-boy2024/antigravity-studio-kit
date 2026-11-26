#!/usr/bin/env python3
"""Atomically swap a strictly signed staged Mac preview into ~/Applications and optionally launch it.

Safe workflow when updating while Antigravity Community Preview.app is currently open:
  1. Build & sign into .staged:  python3 install.py --stage
  2. Quit Antigravity Community Preview.app (Cmd+Q)
  3. Run:  python3 mac-preview/swap_and_launch.py
"""

import argparse
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import sys
import time


def real_user_home() -> Path:
    if os.name == 'posix' and os.environ.get('AGY_USE_ENV_HOME') != '1':
        try:
            return Path(pwd.getpwuid(os.getuid()).pw_dir)
        except Exception:
            pass
    return Path.home()


HERE = Path(__file__).resolve().parent
KIT = HERE.parent
USER_HOME = real_user_home()
TARGET = USER_HOME / 'Applications' / 'Antigravity Community Preview.app'
STAGED = USER_HOME / 'Applications' / 'Antigravity Community Preview.app.staged'
BACKUP = USER_HOME / 'Applications' / 'Antigravity Community Preview.app.prev'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--wait', type=int, default=0, help='Wait up to N seconds for running Preview to exit')
    ap.add_argument('--no-launch', action='store_true', help='Swap the app bundle without launching it afterwards')
    args = ap.parse_args()

    if sys.platform != 'darwin':
        raise SystemExit('This helper is only for macOS.')
    if not STAGED.is_dir() or STAGED.is_symlink():
        raise SystemExit(f'Staged bundle not found: {STAGED} (run `python3 install.py --stage` first)')

    verified = subprocess.run(
        ['/usr/bin/codesign', '--verify', '--deep', '--strict', str(STAGED)],
        capture_output=True, text=True,
    )
    if verified.returncode != 0:
        raise SystemExit(f'Staged bundle failed strict codesign verification:\n{verified.stderr.strip()}')

    sys.path.insert(0, str(KIT / 'injector'))
    import patch_asar_stable as patcher

    deadline = time.time() + max(0, args.wait)
    while patcher.antigravity_running(str(TARGET)):
        if time.time() >= deadline:
            raise SystemExit(
                'Antigravity Community Preview.app is still running. '
                'Please press Cmd+Q to quit it, then re-run swap_and_launch.py.'
            )
        time.sleep(0.5)

    if BACKUP.is_symlink():
        BACKUP.unlink()
    elif BACKUP.exists():
        shutil.rmtree(BACKUP)

    moved_old = False
    try:
        if TARGET.exists() or TARGET.is_symlink():
            os.rename(TARGET, BACKUP)
            moved_old = True
        os.rename(STAGED, TARGET)
    except Exception:
        if moved_old and not TARGET.exists() and BACKUP.exists():
            os.rename(BACKUP, TARGET)
        raise

    if BACKUP.exists():
        shutil.rmtree(BACKUP)

    # Promote staged build/signing reports as current
    output = HERE / 'output'
    for base_name in ('build-report', 'signing-report'):
        src = output / f'{base_name}-staged.json'
        dst = output / f'{base_name}.json'
        if src.is_file():
            shutil.copyfile(src, dst)

    print(f'[ok] updated {TARGET}')
    if not args.no_launch:
        subprocess.run(['/usr/bin/open', '-a', str(TARGET)], check=True)
        print('[ok] launched Antigravity Community Preview.app')
    return 0


if __name__ == '__main__':
    sys.exit(main())
