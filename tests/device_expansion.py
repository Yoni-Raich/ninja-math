"""Read the installed debug WebView via a temporary, device-specific ADB forward."""
import argparse
import json
import subprocess
import time
import urllib.request
from pathlib import Path
import websocket

parser = argparse.ArgumentParser()
parser.add_argument('--serial', required=True)
parser.add_argument('--mode', choices=['before', 'after'], required=True)
args = parser.parse_args()
adb = ['adb', '-s', args.serial]
package = 'com.yoniraich.ninjamath'
output = Path('output/expansion-checks')
output.mkdir(parents=True, exist_ok=True)
pid = subprocess.check_output(adb + ['shell', 'pidof', package], text=True).strip().split()[0]
socket_name = f'webview_devtools_remote_{pid}'
port = subprocess.check_output(adb + ['forward', 'tcp:0', f'localabstract:{socket_name}'], text=True).strip()
connection = None
try:
    for attempt in range(20):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=3) as response:
                targets = json.load(response)
            target = next(t for t in targets if t.get('url', '').startswith('https://localhost') or t.get('url', '').startswith('http://localhost'))
            break
        except Exception:
            if attempt == 19:
                raise
            time.sleep(.3)
    connection = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=10, suppress_origin=True)
    request_id = 0

    def evaluate(expression):
        global request_id
        request_id += 1
        connection.send(json.dumps(dict(id=request_id, method='Runtime.evaluate', params=dict(expression=expression, returnByValue=True))))
        while True:
            reply = json.loads(connection.recv())
            if reply.get('id') == request_id:
                assert 'exceptionDetails' not in reply.get('result', {}), reply
                return reply['result']['result'].get('value')

    raw = evaluate("localStorage.getItem('ninja-math-save-v1')")
    path = output / 'nothing-save-before.json'
    if args.mode == 'before':
        path.write_text(json.dumps(dict(raw=raw), ensure_ascii=False), encoding='utf-8')
        data = json.loads(raw) if raw else {}
        print('PASS read original game save; worlds:', len(data.get('stars', [])), 'belt:', data.get('level', 0), flush=True)
    else:
        backup_path = output / 'nothing-save-backed-up.json'
        original = json.loads((backup_path if backup_path.exists() else path).read_text(encoding='utf-8'))['raw']
        (output / 'nothing-save-after.json').write_text(json.dumps(dict(raw=raw), ensure_ascii=False), encoding='utf-8')
        player = json.loads(original) if original else {}
        current = json.loads(raw) if raw else {}
        # The child may keep playing and buying items during the update check.
        # Compare with the backup taken after force-stop, allowing earned progress
        # and the deliberate v3 migration rather than an earlier live snapshot.
        for index, stars in enumerate(player.get('stars', [])):
            assert current.get('stars', [])[index] >= stars
        assert all(current.get('owned', {}).get(item) for item, owned in player.get('owned', {}).items() if owned)
        for weapon, level in player.get('wlv', {}).items():
            assert current.get('wlv', {}).get(weapon, 1) >= level
        for skill, stats in player.get('stats', {}).items():
            assert current.get('stats', {}).get(skill, {}).get('total', 0) >= stats.get('total', 0)
        assert current.get('coins', 0) >= 0
        assert current.get('unlocked', 1) >= player.get('unlocked', 1)
        active_battle = evaluate("!!document.querySelector('.battle')")
        if not active_battle and evaluate("!!document.getElementById('map')"):
            evaluate("document.getElementById('map').click()")
        for _ in range(30):
            count = evaluate("document.querySelectorAll('.world-hit').length")
            if count == 72 or active_battle:
                break
            time.sleep(.1)
        if active_battle:
            assert evaluate("document.querySelectorAll('#scene .img-layer').length") == 2
            hud = evaluate("document.getElementById('hud').textContent")
            assert hud
            with (output / 'nothing-installed-game.png').open('wb') as picture:
                subprocess.run(adb + ['exec-out', 'screencap', '-p'], stdout=picture, check=True)
            (output / 'nothing-ui-check.json').write_text(json.dumps(dict(activeBattle=True, originalProgressPreserved=True, hud=hud), ensure_ascii=False, indent=2), encoding='utf-8')
            print('PASS on Nothing: updated game running, original progress preserved; kept the active battle on screen', flush=True)
        else:
            assert count == 72, count
            assert evaluate("document.querySelectorAll('.belt-jump').length") == 5
        locks = evaluate("JSON.stringify(Array.from(document.querySelectorAll('.world-hit')).map(b=>({world:Number(b.dataset.w),locked:b.getAttribute('aria-disabled')==='true'})))")
        locks = json.loads(locks)
        if not active_battle and player.get('level', 0) == 0 and not player.get('earnedBelt', 0) and not any(s.get('phase') == 'mastered' for s in player.get('skills', {}).values()):
            assert all(entry['locked'] for entry in locks[24:])
        if not active_battle and all(n > 0 for n in player.get('stars', [])[:12]) and len(player.get('stars', [])) >= 12:
            assert not locks[12]['locked'], 'Completing the old final world must open the expansion'
        if not active_battle:
            time.sleep(.8)
            with (output / 'nothing-installed-map.png').open('wb') as picture:
                subprocess.run(adb + ['exec-out', 'screencap', '-p'], stdout=picture, check=True)
            (output / 'nothing-ui-check.json').write_text(json.dumps(dict(worlds=72, beltTabs=5, originalProgressPreserved=True, locks=locks), indent=2), encoding='utf-8')
            print('PASS on Nothing: 72 worlds, five belt regions, correct locks, and original progress preserved', flush=True)
finally:
    if connection:
        connection.close()
    subprocess.run(adb + ['forward', '--remove', f'tcp:{port}'], check=True)
