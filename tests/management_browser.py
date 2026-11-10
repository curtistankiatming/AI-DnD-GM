"""Batch 3 through actual UI controls. No live model or injected campaign state."""
import json
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
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
    assert page.locator('#combatActions button[data-action-id]').last.get_attribute('data-action-id')=='retreat'
    assert page.evaluate("view.combat.actions.length")==page.locator('#combatActions button[data-action-id]').count()
    page.screenshot(path=str(output/'combat-groups.png'),full_page=True)
    page.locator('#combatActions [data-action-id=end-turn]').click();ready()
    go('party')
    # Every contribution string is from the actual mechanics feed or an honest empty state.
    lines=page.locator('.companion-contribution').all_text_contents()
    events=page.evaluate('eventHistory.map(e=>e.text)')
    for line in lines:
        assert line.removeprefix('Most recently: ') in events
    go('adventure')
    if page.locator('#combatActions [data-action-id=retreat]').count():
        page.locator('#combatActions [data-action-id=retreat]').click()
        expect(page.locator('#sessionDecisionTitle')).to_have_text('Retreat from this fight?')
        page.locator('#sessionDecision button[value=cancel]').click()
        expect(page.locator('#combatPanel')).to_be_visible()
        page.locator('#combatActions [data-action-id=retreat]').click()
        page.locator('#sessionDecision button[value=confirm]').click();ready()
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
    permanent = False
    if not page.evaluate('Boolean(window.BriarwatchOffline)'):
        exercise_advancement_fixture(page, output)
        exercise_trial_fixture(page, output)
        permanent = True
    (output/'management-summary.json').write_text(json.dumps({
        'readOnlyFiltersAndComparison':True,'fourSlotsAllOwners':True,
        'engineBackedEquipmentRoundtrip':True,'prepareDestination':True,
        'groupedOriginalCombatButtons':True,'practiceRoundtrip':True,
        'contributionUsesActualFeed':True,'widths':[320,1440],
        'realModelCalls':0,'permanentSpecializationBrowserAcceptance':permanent
    },indent=2),encoding='utf-8')


def exercise_advancement_fixture(page, output):
    """Controlled level-20 sandbox save: not naturally earned progression."""
    script = """
const E=require('./src/engine'),S=require('./src/public-preview'),P=require('./src/progression');
const s=S.makeSandbox({classId:'fighter',level:10,questId:'aftermath'});
E.awardXp(s,P.XP_NEXT[19]-s.player.xp,[],'Sandbox fixture - not earned progression');
if(E.buildView(s).progression.specializationOptions.length!==3)throw Error('Fixture changed');
process.stdout.write(JSON.stringify(s));
"""
    fixture = json.loads(subprocess.check_output(['node','-e',script],
                          cwd=Path(__file__).resolve().parents[1],text=True))
    base=page.url.rstrip('/')
    # Normal game save API, directed to the smoke test's isolated SAVE_DIR.
    data=json.dumps({'slot':'sandbox-management-trial','state':fixture}).encode()
    with urlopen(Request(base+'/api/session/save',data=data,
                         headers={'Content-Type':'application/json','Origin':base}),timeout=5) as response:
        assert response.status==200
    page.locator('#nav-settings').click()
    page.locator('#refreshSavesBtn').click()
    page.locator('#saveList [data-save-slot=sandbox-management-trial]').get_by_role('button',name='Load',exact=True).click()
    expect(page.locator('#sessionDecision')).to_be_visible()
    page.locator('#sessionDecision').get_by_role('button',name='Discard and continue',exact=True).click()
    expect(page.locator('#playerLevel')).to_have_text('Level 20')
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    page.locator('#nav-prepare').click()
    # Job tree: all three branches are open before the choice.
    tree=page.locator('#jobTree')
    expect(tree.locator('.job-branch')).to_have_count(3)
    expect(tree.locator('.job-branch[data-state=open]')).to_have_count(3)
    expect(tree.locator('.job-tiers [aria-current]')).to_have_text('1st job · levels 1 to 19')
    choose=page.locator('#progressionPanel button[data-action]').filter(has_text='Guardian')
    before=page.evaluate('JSON.stringify(state)')
    choose.click()
    expect(page.locator('#sessionDecisionTitle')).to_have_text('Confirm your 2nd job branch')
    expect(page.locator('#sessionDecisionMessage')).to_contain_text('permanent')
    expect(page.locator('#sessionDecision button[value=cancel]')).to_be_focused()
    page.keyboard.press('Escape')
    expect(page.locator('#sessionDecision')).to_have_count(0)
    assert page.evaluate('JSON.stringify(state)')==before
    choose.click()
    page.screenshot(path=str(output/'permanent-advancement.png'),full_page=True)
    page.locator('#sessionDecision').get_by_role('button',name='Choose Guardian',exact=True).click()
    expect(page.locator('#sessionDecision')).to_have_count(0)
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    assert page.evaluate('state.player.progression.specialization')=='guardian'
    assert page.evaluate('state.player.gold')==fixture['player']['gold']
    assert page.evaluate('state.player.xp')==fixture['player']['xp']
    assert page.evaluate('view.progression.specializationOptions.length')==0
    expect(page.locator('#jobTree .job-branch[data-branch=guardian]')).to_have_attribute('data-state','chosen')
    expect(page.locator('#jobTree .job-branch[data-state=closed]')).to_have_count(2)
    expect(page.locator('#jobTree .job-tiers [aria-current]')).to_contain_text('2nd job')
    page.locator('#jobTree').scroll_into_view_if_needed()
    page.screenshot(path=str(output/'job-tree.png'))
    page.locator('#saveQuickBtn').click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    page.locator('#nav-settings').click()
    page.locator('#saveList [data-save-slot=sandbox-management-trial]').get_by_role('button',name='Load',exact=True).click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    assert page.evaluate('state.player.progression.specialization')=='guardian'
    page.locator('#nav-adventure').click()


def exercise_trial_fixture(page, output):
    """Controlled level-40 Guardian save: the 3rd job trial. AI is off, so the written trial is used."""
    script = """
const E=require('./src/engine'),S=require('./src/public-preview'),P=require('./src/progression');
const s=S.makeSandbox({classId:'fighter',level:10,questId:'aftermath'});
E.awardXp(s,P.XP_NEXT[39]-s.player.xp,[],'Sandbox fixture - not earned progression');
s.player.progression.specialization='guardian';
if(!E.buildView(E.normalizeIncomingState(s)).world.director.trial)throw Error('Fixture changed');
process.stdout.write(JSON.stringify(s));
"""
    fixture = json.loads(subprocess.check_output(['node','-e',script],
                          cwd=Path(__file__).resolve().parents[1],text=True))
    base=page.url.rstrip('/')
    data=json.dumps({'slot':'sandbox-third-job','state':fixture}).encode()
    with urlopen(Request(base+'/api/session/save',data=data,
                         headers={'Content-Type':'application/json','Origin':base}),timeout=5) as response:
        assert response.status==200
    page.locator('#nav-settings').click()
    page.locator('#refreshSavesBtn').click()
    page.locator('#saveList [data-save-slot=sandbox-third-job]').get_by_role('button',name='Load',exact=True).click()
    decision=page.locator('#sessionDecision')
    if decision.count():
        decision.get_by_role('button',name='Discard and continue',exact=True).click()
    expect(page.locator('#playerLevel')).to_have_text('Level 40')
    page.locator('#nav-prepare').click()
    expect(page.locator('#jobTree .job-trial-note')).to_contain_text('Bulwark Knight trial')
    expect(page.locator('#jobTree .job-branch[data-branch=guardian] .job-third-title')).to_have_text('3rd job · Bulwark Knight')
    page.locator('#trialBtn').click()
    card=page.locator('#worldPanel .v4-card').filter(has_text='3rd job trial').filter(has_text='The Bulwark Knight Trial')
    expect(card).to_have_count(1)
    expect(card).to_contain_text('always Hard')
    expect(page.locator('#trialBtn')).to_have_count(0)
    assert page.evaluate("Object.values(state.director.quests).some(q=>q.trial==='third')")
    card.scroll_into_view_if_needed()
    page.screenshot(path=str(output/'third-job-trial.png'))
    page.locator('#nav-adventure').click()
