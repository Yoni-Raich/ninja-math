"""Run with the webapp-testing with_server.py helper; all saves are test fixtures."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_actions import play_activity

OUTPUT = Path('output/expansion-checks')
OUTPUT.mkdir(parents=True, exist_ok=True)
KEY = 'ninja-math-save-v1'
failures = []

def fixture(**changes):
    data = dict(version=2, coins=777, level=0, unlocked=12, stars=[3] * 12,
                owned=dict(kage=True, auto=True, none=True, blades=True, katana=True),
                eq=dict(fighter='kage', weapon='auto', aura='none', special='blades'),
                wlv=dict(katana=3), skills={}, stats=dict(add5=dict(ok=50, total=55)),
                days={}, settings=dict(hints=True, speed=False, sound=False, music=False, voice=False))
    data.update(changes)
    return data

def game(page, name, params=None):
    page.evaluate("async ([name, params]) => { const {go} = await import('/src/main.js'); go(name, params, {instant:true}); }", [name, params or {}])

def state(page):
    return page.evaluate("async () => (await import('/src/game/save.js')).load()")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    def new_game(saved):
        context = browser.new_context(viewport=dict(width=915, height=412))
        context.add_init_script(f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(saved))});")
        page = context.new_page()
        page.on('pageerror', lambda error: failures.append(str(error)))
        page.goto('http://localhost:5173', wait_until='networkidle')
        return context, page

    context, page = new_game(fixture())
    page.locator('#map').click()
    page.locator('.world-hit').first.wait_for()
    page.locator('.wipe').wait_for(state='detached')
    assert page.locator('.world-hit').count() == 72
    assert page.locator('.belt-jump').count() == 5
    saved = state(page)
    assert saved['coins'] == 777 and saved['unlocked'] == 13
    assert saved['stars'][:12] == [3] * 12 and len(saved['stars']) == 72
    assert saved['owned']['katana'] and saved['wlv']['katana'] == 3
    assert saved['version'] == 3 and saved['earnedBelt'] == 0
    assert saved['stats']['add5']['total'] == 55
    assert page.locator('[data-w="12"]').get_attribute('aria-disabled') == 'false'
    assert page.locator('[data-w="24"]').get_attribute('aria-disabled') == 'true'
    page.screenshot(path=str(OUTPUT / 'white-map.png'))
    # Direct routes cannot bypass either the belt or the previous-world gate.
    game(page, 'battle', dict(world=60))
    assert page.locator('.world-hit').count() == 72
    game(page, 'battle', dict(world=13))
    assert page.locator('.world-hit').count() == 72
    for invalid in [-1, 72, 1.5, '1']:
        game(page, 'battle', dict(world=invalid))
        assert page.locator('.world-hit').count() == 72
    page.locator('[data-belt="4"]').click()
    page.wait_for_timeout(650)
    assert 'שחורה' in page.locator('#mapNotice').inner_text()
    page.locator('[data-w="60"]').click(force=True)
    assert 'שחורה' in page.locator('#mapNotice').inner_text()
    page.screenshot(path=str(OUTPUT / 'black-locked.png'))
    # The first new route is a real playable battle with its new sprite and background.
    game(page, 'battle', dict(world=12))
    page.locator('#foe .sprite').wait_for()
    assert 'acornscout.png' in page.locator('#foe .sprite').get_attribute('style')
    page.locator('#choices button:enabled').first.wait_for()
    page.screenshot(path=str(OUTPUT / 'new-white-battle.png'))
    page.clock.install()
    answers = 0
    for _ in range(180):
        if page.locator('#a').count():
            break
        if play_activity(page):
            page.clock.fast_forward(1200)
            continue
        available = page.locator('#choices button:enabled')
        tokens = page.locator('#panel .tok').all_text_contents()
        if available.count() and '?' in tokens:
            left, op, right, _, result = tokens
            answer = (10 - int(left)) if right == '?' else (int(left) + int(right) if op == '+' else int(left) - int(right))
            page.locator(f'#choices button[data-v="{answer}"]:enabled').dispatch_event('pointerdown')
            answers += 1
        page.clock.fast_forward(1200)
    assert page.locator('#a').count(), 'New white world did not reach the result screen'
    assert 'הושלם' in page.locator('.panel-body').inner_text()
    assert state(page)['stars'][12] == 3
    assert state(page)['unlocked'] == 14
    assert answers >= 8
    print(f'PASS old save migration, map gates, direct-route guards, and a full new world ({answers} answers)')
    context.close()

    for belt, world in [(1, 24), (2, 36), (3, 48), (4, 60)]:
        context, page = new_game(fixture(level=belt, earnedBelt=belt, unlocked=world + 1))
        game(page, 'map')
        assert page.locator(f'[data-w="{world}"]').get_attribute('aria-disabled') == 'false'
        game(page, 'battle', dict(world=world))
        page.locator('#foe .sprite').wait_for()
        page.locator('#choices button:enabled').first.wait_for()
        page.screenshot(path=str(OUTPUT / f'belt-{belt}-battle.png'))
        print(f'PASS belt {belt} opens world {world + 1} with a new enemy')
        context.close()

    # At a belt boundary the victory shortcut returns to training, and the title Play
    # button chooses an available world instead of a locked one.
    context, page = new_game(fixture(unlocked=25, stars=[3] * 24))
    game(page, 'result', dict(world=23, won=True, stars=3, answered=10, firstOk=10))
    assert page.locator('#a').inner_text() == 'למפה'
    assert 'צהובה' in page.locator('.panel-body').inner_text()
    page.locator('#a').click()
    page.locator('.world-hit').first.wait_for()
    page.wait_for_timeout(700)
    game(page, 'title')
    page.locator('#play').click()
    page.locator('.battle').wait_for()
    assert 'עולם 24' in page.locator('#hud').inner_text()
    context.close()

    # A previously earned green belt survives easier practice; a mastered skill in an
    # old save also restores the earned belt without clearing inventory or stars.
    context, page = new_game(fixture(level=0, unlocked=49, skills=dict(sub10=dict(phase='mastered', log=[]))))
    assert state(page)['earnedBelt'] == 3
    game(page, 'battle', dict(world=48))
    page.locator('.battle').wait_for()
    context.close()

    context, page = new_game(fixture(level=0, earnedBelt=3, unlocked=49))
    game(page, 'battle', dict(world=48))
    page.locator('.battle').wait_for()
    # A black-belt opponent added by data cannot appear in a low-belt world.
    guard = page.evaluate("async () => { const {WORLDS,FOES}=await import('/src/game/data.js'); const {load}=await import('/src/game/save.js'); const {worldAccess}=await import('/src/game/access.js'); return worldAccess([{belt:0,path:['stardragon']}],FOES,load(),0); }")
    assert guard['reason'] == 'belt'
    context.close()
    browser.close()

assert not failures, failures
print('PASS victory boundary, title shortcut, earned-belt migration, and no browser errors')
