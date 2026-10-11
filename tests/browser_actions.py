"""Shared player actions for the browser checks; no test-only game controls."""

def answer_from_tokens(tokens):
    left, op, right, _, result = tokens
    return (int(result) - int(left)) if right == '?' else (int(left) + int(right) if op == '+' else int(left) - int(right))


def play_activity(page):
    activities = page.locator('[data-activity]')
    if not activities.count():
        return False
    kind = activities.first.get_attribute('data-activity')
    if page.locator('.activity-success, .activity-moving, .activity-miss').count():
        return True
    if kind == 'gate':
        tokens = page.locator('.gate-equation span').all_text_contents()
        if '?' not in tokens:
            return True
        answer = answer_from_tokens(tokens)
        for digit in str(answer):
            page.locator(f'[data-digit="{digit}"]').click()
        page.locator('[data-submit]').click()
    else:
        action = 'jump'
        if kind != 'jump':
            text = page.locator('.hazard-label').inner_text(timeout=1500)
            action = 'jump' if 'נמוך' in text else 'block'
        page.locator(f'[data-action="{action}"]').click()
    return True
