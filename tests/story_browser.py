"""Story screen (redesign step 2): roll chips, the chosen-action line, party panel, phone tabs.

Real browser interaction on a fresh campaign. No model is called.
"""
import re
from playwright.sync_api import expect


# Waits are written as functions: the single-file build's security policy blocks a string condition
# as soon as it has to be polled (it is evaluated with eval), and only lets a function through.
CLEAR_OF_TABS = "()=>{const c=document.getElementById('adventureComposer').getBoundingClientRect(),t=document.getElementById('workspaceNav').getBoundingClientRect();return c.bottom<=t.top+1;}"


def resize(page, width, height):
    """Resize, then let the page's own resize handler run before anything is measured.

    The story screen sets its height from a resize handler. On a busy CI runner a box read
    straight after set_viewport_size can arrive before that handler (master run 78 failed that way).
    """
    page.set_viewport_size({'width': width, 'height': height})
    page.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))')


def words(text):
    """The words of a text, ignoring case, punctuation and line breaks."""
    return ' '.join(re.findall(r"[a-z0-9']+", text.lower().replace('\u2019', "'")))


def exercise_story(page, output):
    output.mkdir(exist_ok=True)
    resize(page, 1440, 900)
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    page.locator('#titleNewBtn').click()  # the title page comes first
    page.locator('#setupName').fill('Story Hero')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#workspace-adventure')).to_be_visible()
    # Wide screen: the party panel sits beside the story and replaces the header strip.
    expect(page.locator('#adventureSide')).to_be_visible()
    expect(page.locator('#sideParty')).to_contain_text('Story Hero')
    expect(page.locator('#partySnapshot')).to_be_hidden()
    expect(page.locator('#storyProse')).to_be_visible()
    expect(page.locator('#storyChips')).to_be_hidden()
    # Spoken lines show the speaker apart ("Orin" then the line, not "Orin: ..."), so compare the words.
    assert words(page.locator('#storyProse').inner_text()) == words(page.locator('#narrationText').inner_text())
    expect(page.locator('#storyProse .story-speaker').first).to_be_visible()
    # A choice with a roll: the roll becomes a chip and leaves the visible prose.
    choice = page.locator('#storyChoices button[data-choice-id]:not([disabled])').filter(has=page.locator('.odds-badge')).first
    label = choice.locator('strong').inner_text()
    choice.click()
    expect(page.locator('#storyChips .roll-chip')).to_have_count(1)
    expect(page.locator('#storyChips .roll-die')).to_have_text(re.compile(r'^\d{1,2}$'))
    expect(page.locator('#storyChips .roll-outcome')).to_have_text(re.compile(r'^(Success|Failure)$'))
    expect(page.locator('#storyDid')).to_contain_text(label)
    full = page.locator('#narrationText').inner_text()
    shown = page.locator('#storyProse').inner_text()
    assert ' rolled ' in full and ' rolled ' not in shown, (full, shown)
    assert shown and words(shown) in words(full), (full, shown)
    # Presentation only: the saved narration is still the full text.
    assert page.evaluate('state.lastNarration') == full
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(output / 'story-1440.png'))
    # Phone: no side panel, the party strip returns, and the tabs sit at the bottom edge.
    for width, height in [(390, 844), (320, 740)]:
        resize(page, width, height)
        expect(page.locator('#adventureSide')).to_be_hidden()
        expect(page.locator('#partySnapshot')).to_have_count(1)
        # A real overlap never clears, so this still fails on one; it only outlasts a late resize handler.
        page.wait_for_function(CLEAR_OF_TABS, timeout=5000)
        tabs = page.locator('#workspaceNav').bounding_box()
        composer = page.locator('#adventureComposer').bounding_box()
        assert abs(tabs['y'] + tabs['height'] - height) <= 1, (width, tabs)
        assert composer['y'] + composer['height'] <= tabs['y'] + 1, (width, composer, tabs)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
        page.screenshot(path=str(output / f'story-{width}.png'))
    # The tabs stay clear of the other screens too.
    page.locator('#nav-party').click()
    expect(page.locator('#workspace-party')).to_be_visible()
    page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
    last = page.evaluate("(()=>{const r=document.getElementById('returnToMessage').getBoundingClientRect(),n=document.getElementById('workspaceNav').getBoundingClientRect();return r.bottom<=n.top+1;})()")
    assert last, 'tabs clear of the last control on the Party screen'
    page.locator('#nav-adventure').click()
    exercise_combat_board(page, output)


def reach_fight(page):
    for _ in range(5):
        if page.evaluate('Boolean(view.combat&&view.combat.active)'):
            break
        page.locator('#storyChoices button[data-choice-id]:not([disabled])').last.click()
        expect(page.locator('#actionSubmitBtn')).to_be_enabled()
    assert page.evaluate('Boolean(view.combat&&view.combat.active)'), 'story choices reach the first fight'
    expect(page.locator('#combatPanel')).to_be_visible()


def fresh_campaign(page, name):
    """Reload and begin a new campaign through the title page, replacing the rolling autosave if asked."""
    page.reload()
    page.locator('#titleNewBtn').click()
    page.locator('#setupName').fill(name)
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    page.locator('#startCampaignBtn').click()
    started = "(name)=>typeof state==='object'&&Boolean(state)&&state.player.name===name&&!busy"
    page.wait_for_function("(name)=>(typeof state==='object'&&Boolean(state)&&state.player.name===name&&!busy)||Boolean(document.querySelector('#sessionDecision button[value=replace]'))", arg=name)
    replace = page.locator('#sessionDecision button[value=replace]')
    if replace.count():
        replace.click()
    page.wait_for_function(started, arg=name)
    expect(page.locator('#workspace-adventure')).to_be_visible()


def exercise_combat_board(page, output):
    """Combat board (redesign step 3). Reaches the first fight through visible story choices."""
    resize(page, 1440, 900)
    for attempt in range(4):
        reach_fight(page)
        if page.evaluate("view.combat.actions.some(a=>a.id==='retreat')"):
            break
        # About 1 fight in 100 the enemies act first and drop the hero before the first turn. The engine
        # then offers only the death save and End Turn, so the board is checked as it stands and the
        # attack and retreat steps below run on a fresh campaign. (This failed PR #31's first Windows run.)
        assert page.evaluate('view.player.hp') <= 0, 'only a downed hero is without Retreat'
        assert page.evaluate('view.combat.actions.length') == page.locator('#combatActions button[data-action-id]').count()
        fresh_campaign(page, f'Story Hero {attempt + 2}')
    else:
        raise AssertionError('four campaigns in a row opened the first fight with the hero down')
    actors = page.evaluate('view.combat.actors.length')
    foes = page.evaluate("view.combat.actors.filter(a=>a.team==='enemy').length")
    # One board: turn order, enemies and party as cards with health bars, the result beside it.
    expect(page.locator('#combatOrder .order-token')).to_have_count(actors)
    expect(page.locator('#combatOrder .order-token.is-current')).to_have_count(1)
    expect(page.locator('#combatEnemies .fighter-card')).to_have_count(foes)
    expect(page.locator('#combatParty .fighter-card')).to_have_count(actors - foes)
    expect(page.locator('#combatPanel .fighter-bar')).to_have_count(actors)
    expect(page.locator('#initiativeTrack')).to_be_hidden()
    expect(page.locator('#adventureSide')).to_be_hidden()
    expect(page.locator('#combatLog #narrationCard')).to_have_count(1)
    # Every engine action is still offered exactly once, and Retreat is still last.
    assert page.evaluate('view.combat.actions.length') == page.locator('#combatActions button[data-action-id]').count()
    assert page.locator('#combatActions button[data-action-id]').last.get_attribute('data-action-id') == 'retreat'
    # The whole fight fits a laptop screen: End Turn is in view without scrolling.
    page.locator('#adventureScroll').evaluate('(n)=>{n.scrollTop=0}')
    end = page.locator('#combatActions [data-action-id=end-turn]').bounding_box()
    frame = page.locator('#adventureScroll').bounding_box()
    assert end['y'] + end['height'] <= frame['y'] + frame['height'] + 1, (end, frame)
    # The weapon is ready by default: each living enemy is a one-tap target showing the engine's hit chance.
    expect(page.locator('#combatHint')).to_contain_text('Tap an enemy')
    targets = page.evaluate("view.combat.actions.find(a=>a.id==='weapon-attack').targets.map(t=>[t.id,t.probability])")
    expect(page.locator('#combatEnemies button.fighter-card')).to_have_count(len(targets))
    for target_id, chance in targets:
        expect(page.locator(f'#combatEnemies button[data-target-id="{target_id}"] .fighter-pill')).to_have_text(f'{chance}% to hit')
    # Arming an ally action moves the targets to the party row and sends nothing.
    before = page.evaluate('JSON.stringify(state)')
    page.locator('#combatActions [data-action-id=brace]').click()
    expect(page.locator('#combatActions [data-action-id=brace]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#combatEnemies button.fighter-card')).to_have_count(0)
    assert page.locator('#combatParty button.fighter-card').count() > 1, 'party members are targets for Brace'
    expect(page.locator('#targetDialog')).to_be_hidden()
    assert page.evaluate('JSON.stringify(state)') == before, 'arming sends nothing'
    page.screenshot(path=str(output / 'combat-1440.png'))
    # Attack by tapping an enemy: the exact engine action is sent, with no pop-up, and the roll shows in the log.
    page.locator('#combatActions [data-action-id=weapon-attack]').click()
    target_id = targets[0][0]
    page.locator(f'#combatEnemies button[data-target-id="{target_id}"]').click()
    # The log already holds the initiative chip, so wait for the engine's answer, not for any chip.
    page.wait_for_function('()=>Boolean(view.combat&&view.combat.economy&&view.combat.economy.actionUsed&&!busy)')
    expect(page.locator('#storyDid')).to_contain_text('Iron Longsword')
    expect(page.locator('#combatLog .roll-die').first).to_be_visible()
    expect(page.locator('#combatLog .roll-outcome').first).to_have_text(re.compile(r'^(Hit|Miss|Critical hit|Critical miss)', re.I))
    expect(page.locator('#targetDialog')).to_be_hidden()
    assert page.evaluate('JSON.stringify(state)') != before, 'the attack reached the engine'
    expect(page.locator('#combatEnemies button.fighter-card')).to_have_count(0)
    for width, height in [(390, 844), (320, 740)]:
        resize(page, width, height)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
        over = page.evaluate("[...document.querySelectorAll('#combatPanel *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+0.5).length")
        assert over == 0, (width, over)
        page.screenshot(path=str(output / f'combat-{width}.png'))
    resize(page, 1440, 900)
    # Leaving the fight returns the latest result to the story column.
    page.locator('#combatActions [data-action-id=retreat]').click()
    page.locator('#sessionDecision button[value=confirm]').click()
    expect(page.locator('#combatPanel')).to_be_hidden()
    expect(page.locator('#adventureScroll > .scene-card #narrationCard')).to_have_count(1)
    expect(page.locator('#storyProse')).to_be_visible()
    exercise_sheets(page, output)


def exercise_sheets(page, output):
    """Party sheet, journal and town (redesign step 4). Presentation only: nothing here sends an action."""
    before = page.evaluate('JSON.stringify(state)')
    # Party: every carried item is still one card; the jump links are a phone aid only.
    page.locator('#nav-party').click()
    expect(page.locator('#inventoryCards .inventory-card')).to_have_count(page.evaluate('view.inventory.length'))
    expect(page.locator('#partyJump')).to_be_hidden()
    waiting = page.evaluate("(view.progression.pending.length||0)+(view.progression.specializationOptions.length?1:0)+((view.progression.renown&&view.progression.renown.pending)||0)")
    if waiting:
        expect(page.locator('#partyPending')).to_be_visible()
    else:
        expect(page.locator('#partyPending')).to_be_hidden()
    page.screenshot(path=str(output / 'party-1440.png'))
    # Journal: the status reads as a label but the record text is unchanged; empty sections fold under "All".
    page.locator('#nav-journal').click()
    expect(page.locator('#workspace-journal')).to_have_attribute('data-filter', 'all')
    titles = page.locator('#journalRecords .journal-record > strong').all_text_contents()
    assert all(re.search(r' \[[^\]]+\]$', t) for t in titles), titles
    assert page.locator('#journalRecords .journal-status').count() == len(titles)
    empty = page.locator('#journalRecords .journal-section.is-empty')
    assert empty.count() == page.evaluate("['leads','promises','rumors','relationships','facts','completed','notes'].filter(g=>!(view.journal[g]||[]).length).length")
    if empty.count():
        expect(empty.first).to_be_hidden()
        expect(page.locator('#journalEmpties')).to_contain_text('Nothing yet under')
    page.locator('.journal-filters [data-filter=notes]').click()
    expect(page.locator('#workspace-journal')).to_have_attribute('data-filter', 'notes')
    expect(page.locator('[data-journal-group=notes]')).to_be_visible()
    expect(page.locator('#journalEmpties')).to_be_hidden()
    page.locator('.journal-filters [data-filter=all]').click()
    page.screenshot(path=str(output / 'journal-1440.png'))
    # Town: the page title comes first, then any waiting choice, then the rest.
    page.locator('#nav-prepare').click()
    order = page.evaluate("[...document.getElementById('workspace-prepare').children].slice(0,3).map(n=>n.id||n.className)")
    assert order[0] == 'workspace-title' and order[2] == 'progressionPanel', order
    expect(page.locator('#workspace-prepare #worldPanel')).to_have_count(1)
    page.screenshot(path=str(output / 'town-1440.png'))
    for width, height in [(390, 844), (320, 740)]:
        resize(page, width, height)
        for tab in ['party', 'journal', 'prepare']:
            page.locator(f'#nav-{tab}').click()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, tab)
            over = page.evaluate("(id)=>[...document.querySelectorAll('#'+id+' *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+0.5).length", f'workspace-{tab}')
            assert over == 0, (width, tab, over)
            page.screenshot(path=str(output / f'{tab}-{width}.png'))
    # On a phone the jump links take you to the pack without a long scroll.
    page.locator('#nav-party').click()
    page.locator('#partyJump button', has_text='Pack').click()
    top = page.evaluate("document.getElementById('inventoryCards').closest('section').getBoundingClientRect().top")
    assert 0 <= top < 200, top
    assert page.evaluate('JSON.stringify(state)') == before, 'looking at the sheets sends nothing'
    resize(page, 1440, 900)
    page.locator('#nav-adventure').click()
