import json
import tarfile
from pathlib import Path

backup = sorted(Path('output').glob('nothing-update-*/app-data-before.tar'))[-1]
decoder = json.JSONDecoder()
snapshots = []
with tarfile.open(backup) as archive:
    for member in archive.getmembers():
        if not member.isfile() or 'Local Storage' not in member.name:
            continue
        text = archive.extractfile(member).read().decode('utf-8', errors='ignore')
        offset = 0
        while True:
            offset = text.find('{"coins":', offset)
            if offset < 0:
                break
            try:
                value, end = decoder.raw_decode(text[offset:])
                snapshots.append((member.name, value, text[offset:offset + end]))
            except ValueError:
                pass
            offset += 1
assert snapshots, 'No full save snapshot found in the backed-up LevelDB log'
name, value, raw = snapshots[-1]
Path('output/expansion-checks/nothing-save-backed-up.json').write_text(json.dumps(dict(raw=raw)), encoding='utf-8')
print('Recovered the save at update time:', name)
print('Coins:', value.get('coins'), 'belt:', value.get('level'), 'version:', value.get('version'), 'fighter:', value.get('eq', {}).get('fighter'))
