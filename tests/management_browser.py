"""Batch 3 through actual UI controls. No live model or injected campaign state."""
import json
from playwright.sync_api import expect


def exercise_management(page, output):
    output.mkdir(exist_ok=True)
    def go(section):
        page.locator('#nav-'+section).click()
        expect(page.locator('#workspace-'+section)).to_be_visible()
    def ready():
        expect(page.locator('#saveQuickBtn')).to_be_enabled()
    go('party')
    expect(page.locator('#equipmentSlots [data-slot]')).to_have_count(4)
    before=page.evaluate('JSON.stringify(state)')
    page.locator('#equipmentOwner').select_option('orin')
    expect(page.locator('#equipmentSlots [data-slot=mainHand]')).to_contain_text('War Mace')
    page.locator('#inventorySearch').fill('Sister Maren')
    expect(page.locator('#inventoryFilterCount')).to_contain_text('3 of')
    page.locator('#inventoryFilterReset').click()
    page.locator('#inventoryCategory').select_option('tools')
    expect(page.locator('#inventoryCards .inventory-card:visible')).to_have_count(1)
    expect(page.locator('#inventoryCards .inventory-card:visible')).to_contain_text('Passive tool')
    page.locator('#inventorySearch').fill('no-such-item')
    expect(page.locator('#inventoryFilterCount')).to_contain_text('No matching items')
    expect(page.locator('#inventoryCards .inventory-card:visible')).to_have_count(0)
    page.locator('#inventoryFilterReset').click()
    page.locator('[data-compare-item=chain-shirt]').click()
    expect(page.locator('#equipmentComparisonDialog')).to_be_visible()
    page.locator('#comparisonOwner').select_option('maren')
    expect(page.locator('.management-dialog table')).to_contain_text('Sister Maren')
    expect(page.locator('.management-dialog table')).to_contain_text('Spell DC bonus')
    page.keyboard.press('Escape')
    expect(page.locator('#equipmentComparisonDialog')).to_have_count(0)
    expect(page.locator('[data-compare-item=chain-shirt]')).to_be_focused()
    assert page.evaluate('JSON.stringify(state)')==before
    gold=page.evaluate('state.player.gold')
    xp=page.evaluate('state.player.xp')
    # A real owner roundtrip, using the original engine endpoint and chooser.
    page.locator('#equipmentSlots [data-slot=mainHand]').get_by_role('button',name='Unequip',exact=True).click()
    ready()
    expect(page.locator('#equipmentSlots [data-slot=mainHand]')).to_contain_text('Empty')
    page.locator('[data-equip-item=war-mace]').click()
    expect(page.locator('#targetOptions [data-target-id=orin] table')).to_be_visible()
    page.locator('#targetOptions [data-target-id=orin]').click()
    ready()
    expect(page.locator('#equipmentSlots [data-slot=mainHand]')).to_contain_text('War Mace')
    assert page.evaluate('state.player.gold')==gold
    assert page.evaluate('state.player.xp')==xp
    assert page.evaluate("state.player.inventory.find(i=>i.itemId==='war-mace').quantity")==1
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(output/'party-320.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1100})
    go('prepare')
    expect(page.locator('#workspace-prepare #worldPanel')).to_have_count(1)
    expect(page.locator('#readinessPanel')).to_contain_text('HP')
    page.locator('#developmentOverview > summary').click()
    expect(page.locator('#developmentOverview')).to_contain_text('future plans')
    d=page.locator('#sideAdventures')
    if not d.evaluate('(n)=>n.open'):d.locator(':scope > summary').click()
    d.get_by_role('button',name='Pause Lantern Road',exact=True).click()
    ready();go('prepare')
    page.locator('[data-prepare-category=shop]').click()
    expect(page.locator('#worldPanel > details[data-section=services]')).to_be_hidden()
    shop=page.locator('#worldPanel > details[data-section=shop]')
    expect(shop).to_be_visible()
    page.locator('[data-prepare-category=all]').click()
    services=page.locator('#worldPanel > details[data-section=services]')
    if not services.evaluate('(n)=>n.open'):services.locator(':scope > summary').click()
    inventory=page.evaluate('JSON.stringify(state.player.inventory)')
    services.get_by_role('button',name='Practice encounter · free',exact=True).click()
    ready();go('adventure')
    expect(page.locator('#combatPanel')).to_be_visible()
    expect(page.locator('#combatActions [data-action-id=end-turn]')).to_have_count(1)
    assert page.locator('#combatActions [data-combat-group]').count()>1
    assert page.evaluate("view.combat.actions.length")==page.locator('#combatActions button[data-action-id]').count()
    page.screenshot(path=str(output/'combat-groups.png'),full_page=True)
    page.locator('#combatActions [data-action-id=end-turn]').click();ready()
    go('party')
    # Every contribution string is from the actual mechanics feed or an honest empty state.
    lines=page.locator('.companion-contribution').all_text_contents()
    events=page.evaluate('eventHistory.map(e=>e.text)')
    for line in lines:
        assert line.startswith('No attributable') or line.removeprefix('Recent confirmed contribution: ') in events
    go('adventure')
    if page.locator('#combatActions [data-action-id=retreat]').count():
        page.locator('#combatActions [data-action-id=retreat]').click();ready()
    assert page.evaluate('state.player.gold')==gold
    assert page.evaluate('state.player.xp')==xp
    assert page.evaluate('JSON.stringify(state.player.inventory)')==inventory
    go('prepare')
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(output/'preparation-320.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1100})
    go('party');page.locator('#equipmentOwner').select_option('player')
    page.locator('#inventoryFilterReset').click();go('adventure')
    (output/'management-summary.json').write_text(json.dumps({
        'readOnlyFiltersAndComparison':True,'fourSlotsAllOwners':True,
        'engineBackedEquipmentRoundtrip':True,'prepareDestination':True,
        'groupedOriginalCombatButtons':True,'practiceRoundtrip':True,
        'contributionUsesActualFeed':True,'widths':[320,1440],
        'realModelCalls':0,'permanentSpecializationBrowserAcceptance':False
    },indent=2),encoding='utf-8')
