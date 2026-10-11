"""Play through real routes and check the new inputs, rewards, bosses, and cleanup."""
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_actions import play_activity, answer_from_tokens

OUTPUT = Path('output/variety-checks')
OUTPUT.mkdir(parents=True, exist_ok=True)
KEY = 'ninja-math-save-v1'
errors = []

def game(page, name, params=None):
    page.evaluate("async ([name, params]) => {const {go}=await import('/src/main.js'); go(name,params,{instant:true});}", [name, params or {}])

def save(page):
    return page.evaluate("async () => (await import('/src/game/save.js')).load()")

def math_answer(page):
    tokens = page.locator('#panel .tok').all_text_contents()
    return answer_from_tokens(tokens) if len(tokens) == 5 and '?' in tokens else None

def play_step(page, delta=700):
    try:
        if not play_activity(page):
            ans = math_answer(page)
            if ans is not None and page.locator(f'#choices [data-v="{ans}"]:enabled').count():
                page.locator(f'#choices [data-v="{ans}"]').dispatch_event('pointerdown')
    except Exception:
        page.screenshot(path=str(OUTPUT / 'failure.png'))
        (OUTPUT / 'failure.html').write_text(page.content(), encoding='utf-8')
        print('Browser errors:', errors, flush=True)
        raise
    page.clock.fast_forward(delta)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def create(level=0):
        context = browser.new_context(viewport=dict(width=915, height=412))
        data = dict(version=3, coins=100, level=level, earnedBelt=4, unlocked=72, stars=[0]*72,
                    eq=dict(fighter='kage', weapon='auto', aura='none', special='blades'),
                    settings=dict(hints=True,speed=False,sound=False,music=False,voice=False))
        context.add_init_script(f"localStorage.setItem({json.dumps(KEY)},{json.dumps(json.dumps(data))});")
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        clock_start = datetime(2026, 10, 11, 12)
        page.clock.install(time=clock_start)
        page.clock.pause_at(clock_start + timedelta(seconds=1))
        page.goto('http://localhost:5173', wait_until='networkidle')
        return context, page

    for world, pattern in [(0,'shield'),(1,'wave'),(2,'sequence')]:
        context, page = create()
        game(page, 'battle', dict(world=world))
        seen = set()
        boss_tested = False
        gate_tested = False
        for i in range(450):
            if page.locator('#a').count():
                break
            act = page.locator('[data-activity]')
            if act.count():
                kind = act.first.get_attribute('data-activity')
                if kind != 'defense' and kind not in seen:
                    page.screenshot(path=str(OUTPUT / f'{kind}-world-{world+1}.png'))
                    seen.add(kind)
                if kind == 'gate' and not gate_tested:
                    gate_tested = True
                    ans = answer_from_tokens(page.locator('.gate-equation span').all_text_contents())
                    coins_before = save(page)['coins']
                    hearts_before = page.locator('#hearts').get_attribute('aria-label')
                    # Empty submit cannot record or pay a reward.
                    assert page.locator('[data-submit]').is_disabled()
                    page.locator('[data-digit="0"]').click()
                    page.locator('[data-submit]').click()
                    assert page.locator('[data-activity="gate"]').count()
                    assert save(page)['coins'] == coins_before
                    assert page.locator('#hearts').get_attribute('aria-label') == hearts_before
                    assert not page.locator('.gate-hint').is_hidden()
                    for digit in str(ans):
                        page.locator(f'[data-digit="{digit}"]').click()
                    page.locator('[data-submit]').click()
                    # Fast double presses must pay only once.
                    page.locator('[data-submit]').click()
                    page.clock.fast_forward(800)
                    assert save(page)['coins'] == coins_before + 18
                    continue
            boss = page.locator('[data-pattern]')
            ans = math_answer(page)
            if boss.count() and ans is not None and page.locator(f'#choices [data-v="{ans}"]:enabled').count() and not boss_tested:
                assert boss.get_attribute('data-pattern') == pattern
                if pattern == 'shield':
                    assert boss.get_attribute('data-shields') == '1'
                    hp_before = page.locator('[aria-label="חיים של היריב"] span').evaluate_all("els=>els.filter(e=>!e.getAttribute('style').includes('#2A1216')).length")
                    page.locator(f'#choices [data-v="{ans}"]').dispatch_event('pointerdown')
                    page.clock.fast_forward(400)
                    assert boss.get_attribute('data-shields') == '0'
                    hp_after = page.locator('[aria-label="חיים של היריב"] span').evaluate_all("els=>els.filter(e=>!e.getAttribute('style').includes('#2A1216')).length")
                    assert hp_before == hp_after
                    page.screenshot(path=str(OUTPUT/'boss-shield.png'))
                else:
                    wrong = page.locator(f'#choices button:not([data-v="{ans}"]):enabled').first
                    wrong.dispatch_event('pointerdown')
                    for _ in range(45):
                        if page.locator('[data-activity="defense"]').count(): break
                        page.clock.fast_forward(500)
                    assert page.locator('[data-activity="defense"]').count(), pattern
                    assert page.locator('.move-cue').count() == (1 if pattern == 'wave' else 2)
                    page.screenshot(path=str(OUTPUT / f'boss-{pattern}.png'))
                    hearts = page.locator('#hearts').get_attribute('aria-label')
                    for _ in range(8):
                        if not page.locator('[data-activity="defense"]').count(): break
                        play_activity(page); page.clock.fast_forward(700)
                    assert page.locator('#hearts').get_attribute('aria-label') == hearts
                    assert page.locator('#chargeFill').count(), 'Boss wind-up must resume after a dodge'
                boss_tested = True
                continue
            play_step(page)
        assert page.locator('#a').count(), f'World {world+1} stuck'
        assert 'הושלם' in page.locator('.panel-body').inner_text()
        assert seen == {'jump','trap','gate'}
        assert boss_tested and gate_tested
        assert save(page)['stars'][world] == 3
        page.clock.fast_forward(800)
        time.sleep(1.2)  # Let the browser's native CSS entrance animations finish.
        page.screenshot(path=str(OUTPUT / f'completed-world-{world+1}.png'))
        print('Result layout:', page.locator('.panel-frame').bounding_box(), flush=True)
        assert page.locator('.panel-frame').bounding_box()['y'] + page.locator('.panel-frame').bounding_box()['height'] <= 412
        page.screenshot(path=str(OUTPUT / f'completed-world-{world+1}.png'))
        print(f'PASS full world {world+1}: three activities, free gate retry, exact reward, {pattern} boss, and victory', flush=True)
        context.close()

    # Pause a hop mid-air, then resume, leave, and wait past every scheduled callback.
    context, page = create()
    game(page, 'battle', dict(world=world))
    for _ in range(180):
        if page.locator('[data-activity="jump"]').count(): break
        play_step(page)
    page.locator('[data-action="jump"]').click()
    page.locator('#pause').click()
    step = page.locator('.activity-step').inner_text()
    page.clock.fast_forward(5000)
    assert page.locator('.activity-step').inner_text() == step
    page.locator('#resume').click()
    page.clock.fast_forward(750)
    assert page.locator('.activity-step').inner_text() != step
    page.locator('#pause').click()
    page.locator('#toMap').click()
    page.clock.fast_forward(700)
    page.clock.fast_forward(30000)
    assert page.locator('.world-hit').count() == 72
    assert page.locator('[data-activity]').count() == 0
    print('PASS mid-hop pause, resume, and clean exit to map', flush=True)
    context.close()

    # Route traps forgive wrong moves; a wrong boss defense costs exactly one heart.
    context, page = create()
    game(page, 'battle', dict(world=1))
    for _ in range(250):
        if page.locator('[data-activity="trap"]').count(): break
        play_step(page)
    hearts = page.locator('#hearts').get_attribute('aria-label')
    coins = save(page)['coins']
    correct = 'jump' if 'נמוך' in page.locator('.hazard-label').inner_text() else 'block'
    wrong = 'block' if correct == 'jump' else 'jump'
    page.locator(f'[data-action="{wrong}"]').click()
    page.clock.fast_forward(1000)
    assert page.locator('#hearts').get_attribute('aria-label') == hearts
    assert save(page)['coins'] == coins
    assert page.locator('[data-activity="trap"]').count()
    for _ in range(300):
        if page.locator('[data-pattern="wave"]').count() and math_answer(page) is not None: break
        play_step(page)
    answer = math_answer(page)
    page.locator(f'#choices button:not([data-v="{answer}"]):enabled').first.dispatch_event('pointerdown')
    for _ in range(45):
        if page.locator('[data-activity="defense"]').count(): break
        page.clock.fast_forward(500)
    assert page.locator('[data-activity="defense"]').count()
    correct = 'jump' if 'נמוך' in page.locator('.hazard-label').inner_text() else 'block'
    wrong = 'block' if correct == 'jump' else 'jump'
    page.locator(f'[data-action="{wrong}"]').click()
    page.clock.fast_forward(700)
    page.clock.fast_forward(1700)
    assert page.locator('#hearts').get_attribute('aria-label') == '2 לבבות'
    assert page.locator('#choices button:enabled').count()
    print('PASS free trap retry and exactly one heart lost after a wrong boss defense', flush=True)
    context.close()

    # Higher-belt gates accept two digits and backspace; shield bosses have two shields.
    context, page = create(level=4)
    game(page, 'battle', dict(world=60))
    for _ in range(250):
        if page.locator('[data-activity="gate"]').count(): break
        play_step(page)
    answer = answer_from_tokens(page.locator('.gate-equation span').all_text_contents())
    assert answer > 10
    page.locator('[data-digit="9"]').click()
    page.locator('[data-clear]').click()
    assert page.locator('.gate-input').inner_text() == '?'
    for digit in str(answer): page.locator(f'[data-digit="{digit}"]').click()
    assert page.locator('.gate-input').inner_text() == str(answer)
    page.locator('[data-submit]').click()
    page.clock.fast_forward(800)
    for _ in range(300):
        if page.locator('[data-pattern="shield"]').count() and math_answer(page) is not None: break
        play_step(page)
    assert page.locator('[data-pattern="shield"]').get_attribute('data-shields') == '2'
    print('PASS black-belt two-digit gate, backspace, and two boss shields', flush=True)
    context.close()
    browser.close()

assert not errors, errors
print('PASS no browser errors', flush=True)
