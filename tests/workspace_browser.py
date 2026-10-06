"""Batch 2 navigation helpers and real-interface acceptance. No model inference."""
import json
from playwright.sync_api import expect


def go(page, section):
    page.locator('#nav-' + section).click()
    expect(page.locator('#workspace-' + section)).to_be_visible()


def mode(page, value):
    go(page, 'adventure')
    page.locator('#mode-' + value).click()


def journal(page):
    go(page, 'journal')
    d = page.locator('#storyJournal')
    if not d.evaluate('(n)=>n.open'):
        d.locator(':scope > summary').click()


def model_settings(page):
    go(page, 'settings')
    d = page.locator('#localAISettings')
    if not d.evaluate('(n)=>n.open'):
        d.locator(':scope > summary').click()


def offline_tools(page, setup=False):
    if not setup:
        go(page, 'settings')
    d = page.locator('#setupOfflineTools' if setup else '#offlineTools')
    if not d.evaluate('(n)=>n.open'):
        d.locator(':scope > summary').click()


def scenario(page, title):
    go(page, 'prepare')
    d = page.locator('#sideAdventures')
    if not d.evaluate('(n)=>n.open'):
        d.locator(':scope > summary').click()
    d.get_by_role('button', name=title, exact=True).click()
    expect(page.locator('#workspace-adventure')).to_be_visible()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()


def instructions(page, text):
    go(page, 'adventure')
    page.locator('#editInstructionsBtn').click()
    expect(page.locator('#instructionsEditor')).to_be_focused()
    page.locator('#instructionsEditor').fill(text)
    page.locator('#saveInstructionsBtn').click()
    expect(page.locator('#instructionsDialog')).to_have_count(0)
    expect(page.locator('#saveQuickBtn')).to_be_enabled()


def exercise_workspace(page, output, offline):
    output.mkdir(exist_ok=True)
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    page.locator('#setupName').fill('Workspace Hero')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#workspace-adventure')).to_be_visible()
    expect(page.locator('#nav-adventure')).to_have_attribute('aria-selected', 'true')
    assert page.locator('#workspaceNav [role=tab]').count() == 5
    assert page.evaluate('(()=>{const ids=[...document.querySelectorAll("[id]")].map(n=>n.id);return ids.length===new Set(ids).size;})()')
    # One composer and one confirmation, three explicit modes, no everyday instructions replacement mode.
    expect(page.locator('#adventureComposer #actionForm')).to_have_count(1)
    expect(page.locator('#adventureScroll #chatPending')).to_have_count(1)
    expect(page.locator('#adventureComposer #chatPending')).to_have_count(0)
    expect(page.locator('#messageModes [role=radio]')).to_have_count(3)
    expect(page.locator('#chatMode option[value=instructions]')).to_have_count(0)
    before = page.evaluate('JSON.stringify(state)')
    page.locator('#nav-adventure').focus()
    page.keyboard.press('ArrowRight')
    expect(page.locator('#nav-party')).to_be_focused()
    expect(page.locator('#nav-party')).to_have_attribute('aria-selected', 'true')
    expect(page.locator('#workspace-adventure')).to_be_hidden()
    page.keyboard.press('End')
    expect(page.locator('#nav-settings')).to_be_focused()
    page.keyboard.press('Home')
    expect(page.locator('#nav-adventure')).to_be_focused()
    # Read-only navigation must not mutate the campaign or clear a draft.
    assert page.evaluate('JSON.stringify(state)') == before
    page.locator('#actionInput').fill('My next unsent action.')
    go(page, 'party');go(page, 'journal');go(page, 'prepare');go(page, 'adventure')
    expect(page.locator('#actionInput')).to_have_value('My next unsent action.')
    page.locator('#mode-action').focus();page.keyboard.press('ArrowRight')
    expect(page.locator('#mode-dialogue')).to_have_attribute('aria-checked','true')
    expect(page.locator('#chatMode')).to_have_value('dialogue')
    page.keyboard.press('End')
    expect(page.locator('#mode-question')).to_have_attribute('aria-checked','true')
    assert page.evaluate('JSON.stringify(state)') == before
    page.locator('#editInstructionsBtn').click()
    page.locator('#instructionsEditor').fill('This draft must not be saved.')
    page.keyboard.press('Escape')
    expect(page.locator('#instructionsDialog')).to_have_count(0)
    expect(page.locator('#editInstructionsBtn')).to_be_focused()
    assert page.evaluate('JSON.stringify(state)') == before
    instructions(page, 'Keep the tone hopeful and decisions mine.')
    expect(page.locator('#campaignInstructions')).to_have_text('Keep the tone hopeful and decisions mine.')
    expect(page.locator('#actionInput')).to_have_value('My next unsent action.')
    expect(page.locator('#chatMode')).to_have_value('question')
    # The target picker enters, contains, and restores focus without executing.
    page.locator('#actionInput').fill('')
    go(page,'party')
    equip=page.locator('#inventoryCards button[data-equip-item]').first
    equip.click()
    expect(page.locator('#targetDialog')).to_be_visible()
    expect(page.locator('#targetDialogTitle')).to_be_focused()
    assert page.locator('.app-shell').evaluate('(n)=>n.inert')
    page.keyboard.press('Tab')
    expect(page.locator('#targetDialogClose')).to_be_focused()
    page.keyboard.press('Shift+Tab')
    # Starter equipment is fully assigned: only Close is actionable.
    expect(page.locator('#targetOptions button:not([disabled])')).to_have_count(0)
    expect(page.locator('#targetDialogClose')).to_be_focused()
    page.keyboard.press('Escape')
    expect(page.locator('#targetDialog')).to_be_hidden()
    expect(equip).to_be_focused()
    assert not page.locator('.app-shell').evaluate('(n)=>n.inert')
    # An owned potion provides multiple legal targets; cancel before consumption.
    before_picker = page.evaluate('JSON.stringify(state)')
    potion = page.locator('[data-use-item=healing-potion]')
    potion.click()
    expect(page.locator('#targetDialogTitle')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.locator('#targetDialogClose')).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.locator('#targetOptions button:not([disabled])').last).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.locator('#targetDialogClose')).to_be_focused()
    page.keyboard.press('Escape')
    expect(page.locator('#targetDialog')).to_be_hidden()
    expect(potion).to_be_focused()
    assert page.evaluate('JSON.stringify(state)') == before_picker
    journal(page)
    assert page.locator('#workspace-journal #storyJournal').count()==1
    assert page.locator('#workspace-journal #clueList').count()==1
    assert page.locator('#workspace-journal #historyList').count()==1
    facts_before=page.evaluate('JSON.stringify(state)')
    page.locator('.journal-filters [data-filter=notes]').click()
    expect(page.locator('[data-journal-group=facts]')).to_be_hidden()
    expect(page.locator('[data-journal-group=notes]')).to_be_visible()
    page.locator('.journal-filters [data-filter=evidence]').click()
    expect(page.locator('[data-journal-group=rumors]')).to_be_visible()
    expect(page.locator('#clueList')).to_be_visible()
    assert page.evaluate('JSON.stringify(state)')==facts_before
    page.locator('.journal-filters [data-filter=all]').click()
    # Existing scene, approaches and mechanics retain a route from the new shell.
    scenario(page,'Start Lantern Road')
    expect(page.locator('#roadScenario')).to_contain_text('Active: wagon')
    expect(page.locator('#choicePanel')).to_be_hidden()
    expect(page.locator('#roadScenario')).to_be_visible()
    for width,height in [(1440,1100),(390,844),(320,740),(760,520)]:
        page.set_viewport_size({'width':width,'height':height})
        go(page,'adventure')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width,height)
        box=page.locator('#adventureComposer').bounding_box()
        assert box['width']<=width and box['x']>=0
        if height>650:
            assert box['y']+box['height']<=height+3, (width,height,box)
        expect(page.locator('#adventureOverview')).to_have_count(1)
        expect(page.locator('#adventureScroll > #adventureOverview')).to_have_count(1 if width<=760 else 0)
        page.screenshot(path=str(output/f'workspace-{width}.png'),full_page=True)
    # A long confirmation must not force the composer out of a narrow viewport.
    page.set_viewport_size({'width':320,'height':740});go(page,'adventure')
    mechanics_before = page.evaluate('JSON.stringify([state.player,state.party,state.story,state.world,state.turnCount])')
    page.locator('#roadScenario').get_by_role('button',name='Repair the wagon in exchange for help at the crossing',exact=True).click()
    expect(page.locator('#chatPending')).to_contain_text('No roll or resource change has happened yet.')
    box=page.locator('#adventureComposer').bounding_box()
    assert box['y']+box['height']<=743, box
    page.get_by_role('button',name='Cancel proposal',exact=True).click()
    expect(page.locator('#chatPending')).to_be_empty()
    assert page.evaluate('JSON.stringify([state.player,state.party,state.story,state.world,state.turnCount])') == mechanics_before
    go(page,'settings');page.locator('#readingSize').select_option('larger')
    go(page,'journal');page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(output/'journal-large-text.png'),full_page=True)
    go(page,'settings');page.locator('#readingSize').select_option('normal')
    go(page,'adventure');page.set_viewport_size({'width':1440,'height':1100})
    from management_browser import exercise_management
    exercise_management(page, output/'batch3')
    (output/'workspace-summary.json').write_text(json.dumps({
        'fiveDestinations':True,'keyboardTabsAndModes':True,'draftPreserved':True,
        'separateInstructionEditor':True,'cancelDoesNotSave':True,'targetFocusAndInert':True,
        'unifiedJournalFilters':True,'navigationReadOnly':True,'narrowConfirmationAndComposer':True,
        'widths':[1440,390,320,760],'largeReadingText':True,'realModelCalls':0
    },indent=2),encoding='utf-8')
