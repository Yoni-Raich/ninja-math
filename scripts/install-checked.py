"""Update Ninja Math through a named ADB device; keep a private app-data backup."""
import argparse
import datetime
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--serial', required=True)
parser.add_argument('--apk', required=True)
parser.add_argument('--manufacturer', default='Nothing')
parser.add_argument('--from-code', type=int, default=4)
parser.add_argument('--to-code', type=int, default=5)
parser.add_argument('--version', default='1.4.0')
args = parser.parse_args()
package = 'com.yoniraich.ninjamath'
apk = Path(args.apk).resolve()
assert apk.is_file(), apk
devices = subprocess.check_output(['adb', 'devices', '-l'], text=True)
assert any(line.split()[:2] == [args.serial, 'device'] for line in devices.splitlines()), 'Selected device is not connected/authorized'
adb = ['adb', '-s', args.serial]

def command(*arguments):
    return subprocess.check_output(adb + list(arguments), text=True, encoding='utf-8', errors='replace').strip()

manufacturer = command('shell', 'getprop', 'ro.product.manufacturer')
assert manufacturer.lower() == args.manufacturer.lower(), f'Wrong device: {manufacturer}'
before = command('shell', 'dumpsys', 'package', package)
assert re.search(r'\bversionCode=' + str(args.from_code) + r'\b', before), 'Review the installed version before updating'
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
output = Path('output') / f'nothing-update-{stamp}'
output.mkdir(parents=True, exist_ok=False)
(output / 'package-before.txt').write_text(before, encoding='utf-8')
command('shell', 'am', 'force-stop', package)
with (output / 'app-data-before.tar').open('wb') as backup:
    subprocess.run(adb + ['exec-out', 'run-as', package, 'tar', '-cf', '-', 'app_webview', 'shared_prefs', 'databases', 'files'], stdout=backup, check=True)
assert (output / 'app-data-before.tar').stat().st_size > 0
print('Backed up app data to', output, flush=True)
print(command('install', '-r', str(apk)), flush=True)
after = command('shell', 'dumpsys', 'package', package)
(output / 'package-after.txt').write_text(after, encoding='utf-8')
assert re.search(r'\bversionCode=' + str(args.to_code) + r'\b', after) and f'versionName={args.version}' in after
old_first = re.search(r'firstInstallTime=([^\r\n]+)', before)
new_first = re.search(r'firstInstallTime=([^\r\n]+)', after)
assert old_first and new_first and old_first.group(1) == new_first.group(1), 'Original installation must be preserved'
print(command('shell', 'am', 'start', '-W', '-n', f'{package}/.MainActivity'), flush=True)
with (output / 'installed-game.png').open('wb') as picture:
    subprocess.run(adb + ['exec-out', 'screencap', '-p'], stdout=picture, check=True)
(output / 'receipt.json').write_text(json.dumps(dict(serial=args.serial, manufacturer=manufacturer, package=package, version=args.version, versionCode=args.to_code, originalInstallTime=new_first.group(1), apk=str(apk)), indent=2), encoding='utf-8')
print(f'PASS installed {args.version} ({args.to_code}), original installation and private data preserved:', output, flush=True)
