"""Story screen (redesign step 2): roll chips, the chosen-action line, party panel, phone tabs.

Real browser interaction on a fresh campaign. No model is called.
"""
import re
from playwright.sync_api import expect


def exercise_story(page, output):
    output.mkdir(exist_ok=True)
    page.set_viewport_size({'width': 1440, 'height': 900})
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    page.locator('#setupName').fill('Story Hero')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#workspace-adventure')).to_be_visible()
    # Wide screen: the party panel sits beside the story and replaces the header strip.
    expect(page.locator('#adventureSide')).to_be_visible()
    expect(page.locator('#sideParty')).to_contain_text('Story Hero')
    expect(page.locator('#partySnapshot')).to_be_hidden()
    expect(page.locator('#storyProse')).to_be_visible()
    expect(page.locator('#storyChips')).to_be_hidden()
    assert page.locator('#storyProse').inner_text() == page.locator('#narrationText').inner_text()
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
    assert shown and shown in full
    # Presentation only: the saved narration is still the full text.
    assert page.evaluate('state.lastNarration') == full
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(output / 'story-1440.png'))
    # Phone: no side panel, the party strip returns, and the tabs sit at the bottom edge.
    for width, height in [(390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        expect(page.locator('#adventureSide')).to_be_hidden()
        expect(page.locator('#partySnapshot')).to_have_count(1)
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
    assert last
    page.locator('#nav-adventure').click()
