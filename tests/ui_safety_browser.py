"""Batch 1 acceptance: real controls and temporary profiles; no real model calls."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from playwright.sync_api import expect


def choose(page, name):
    dialog = page.locator('#sessionDecision')
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name=name, exact=True).click()
    expect(dialog).to_have_count(0)


def submit(page, text, mode='action'):
    page.locator('#chatMode').select_option(mode)
    page.locator('#actionInput').fill(text)
    page.locator('#actionSubmitBtn').click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()


def save_as(page, slot):
    page.get_by_role('button', name='Saves', exact=True).click()
    page.locator('#saveSlotInput').fill(slot)
    page.locator('#saveBtn').click()
    expect(page.locator('#saveStatus')).to_contain_text('Saved checkpoint')
    expect(page.locator('#saveStatus')).to_contain_text(slot)
    expect(page.locator('#saveQuickBtn')).to_be_enabled()


def select_save(page, slot):
    page.get_by_role('button', name='Saves', exact=True).click()
    card = page.locator('#saveList .save-card').filter(has=page.get_by_text(slot, exact=True))
    expect(card).to_have_count(1)
    return card


def exercise_safety(page, output, offline):
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    expect(page.locator('#resumePanel')).to_be_visible()
    page.locator('#setupName').fill('Safety Hero A')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
    save_as(page, 'ui-safety-a')
    submit(page, 'Keep the weather calm.', 'instructions')
    expect(page.locator('#saveStatus')).to_contain_text('Unsaved changes')
    page.locator('#newGameBtn').click()
    expect(page.locator('#returnToGameBtn')).to_be_visible()
    page.locator('#setupName').fill('Safety Hero B')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#sessionDecision')).to_be_visible()
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
    # Native modal focuses Cancel and Escape does not discard anything.
    expect(page.locator('#sessionDecision button').first).to_be_focused()
    page.screenshot(path=str(output / 'unsaved-warning.png'), full_page=True)
    page.keyboard.press('Escape')
    expect(page.locator('#sessionDecision')).to_have_count(0)
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
    page.locator('#startCampaignBtn').click()
    choose(page, 'Save and continue')
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero B')
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    second_slot = page.locator('#saveSlotInput').input_value()
    assert second_slot != 'ui-safety-a'
    page.locator('#saveQuickBtn').click()
    expect(page.locator('#saveStatus')).to_contain_text('Saved checkpoint')
    expect(page.locator('#saveStatus')).to_contain_text(second_slot)
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    page.locator('#saveSlotInput').fill('ui-safety-a')
    page.locator('#saveBtn').click()
    expect(page.locator('#sessionDecision')).to_contain_text('Safety Hero A')
    choose(page, 'Cancel')
    select_save(page, 'ui-safety-a').get_by_role('button', name='Delete', exact=True).click()
    expect(page.locator('#sessionDecision')).to_contain_text('Safety Hero A')
    choose(page, 'Cancel')
    select_save(page, 'ui-safety-a').get_by_role('button', name='Load', exact=True).click()
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
    expect(page.locator('#campaignInstructions')).to_have_text('Keep the weather calm.')
    page.locator('#actionInput').fill('An unsent draft to keep.')
    select_save(page, second_slot).get_by_role('button', name='Load', exact=True).click()
    choose(page, 'Cancel')
    expect(page.locator('#actionInput')).to_have_value('An unsent draft to keep.')
    page.locator('#actionInput').fill('')
    page.locator('#newGameBtn').click()
    expect(page.locator('#continueBtn')).to_contain_text('Safety Hero A')
    page.locator('#continueBtn').click()
    expect(page.locator('#setupOverlay')).to_be_hidden()
    expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
    select_save(page, second_slot).get_by_role('button', name='Delete', exact=True).click()
    choose(page, 'Delete saved file')
    expect(page.locator('#saveList')).not_to_contain_text(second_slot)
    page.get_by_role('button', name='Start Lantern Road', exact=True).click()
    expect(page.locator('#roadScenario')).to_contain_text('Active: wagon')
    expect(page.locator('#storyChoices')).to_contain_text('Lantern Road')
    expect(page.locator('#storyChoices')).not_to_contain_text('combat is active')
    page.get_by_role('button', name='Inventory', exact=True).click()
    page.locator('#inventoryCards').get_by_role('button', name='Inspect', exact=True).first.click()
    expect(page.locator('#sessionDecision')).to_be_visible()
    choose(page, 'Close')
    if not offline:
        # A deliberately failed write must keep the current campaign open.
        page.route('**/api/session/save', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":"Synthetic save failure"}'))
        page.locator('#newGameBtn').click()
        page.locator('#setupName').fill('Must Not Replace')
        page.locator('#startCampaignBtn').click()
        choose(page, 'Save and continue')
        expect(page.locator('#toastRegion')).to_contain_text('Synthetic save failure')
        expect(page.locator('#playerIdentity')).to_contain_text('Safety Hero A')
        page.unroute('**/api/session/save')
        page.locator('#returnToGameBtn').click()
        exercise_wait(page, output)
    page.set_viewport_size({'width':390, 'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output / 'safety-mobile.png'), full_page=True)
    (output / 'safety-summary.json').write_text(json.dumps({
        'newCampaignSaveIsolation':True, 'saveAndContinue':True, 'cancelPreservesProgressAndDraft':True,
        'overwriteWarning':True, 'deleteConfirmation':True, 'homeContinue':True,
        'contextualEmptyState':True, 'equipmentInspection':True, 'failedSaveKeepsCampaign':not offline,
        'modelWaitNavigationAndDraft':not offline, 'realModelCalls':0
    }, indent=2), encoding='utf-8')


def exercise_wait(page, output):
    arrived, release = threading.Event(), threading.Event()
    requests = []
    class Model(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            requests.append(body)
            arrived.set()
            if not release.wait(30):
                self.send_error(504)
                return
            data = json.dumps({'choices':[{'finish_reason':'stop', 'message':{'content':json.dumps({'kind':'question','optionId':'','reply':'Synthetic description after a deliberate wait.'})}}]}).encode()
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers()
            self.wfile.write(data)
    base = page.url.rstrip('/')
    with urlopen(base+'/api/ai/settings',timeout=5) as response:
        original = json.load(response)['config']
    model = ThreadingHTTPServer(('127.0.0.1',0),Model)
    threading.Thread(target=model.serve_forever,daemon=True).start()
    try:
        page.locator('#localAISettings summary').click()
        page.locator('#localAIBase').fill(f'http://127.0.0.1:{model.server_port}/v1')
        page.locator('#localAIModel').fill('ui-wait-synthetic')
        page.locator('#localAIEnabled').check()
        with page.expect_response(lambda r:r.url.endswith('/api/ai/settings') and r.request.method=='POST'):
            page.get_by_role('button',name='Save AI settings',exact=True).click()
        expect(page.locator('#saveQuickBtn')).to_be_enabled()
        page.locator('#chatMode').select_option('question')
        # Does not match the deterministic journal/road answer keywords.
        page.locator('#actionInput').fill('Describe the surrounding atmosphere.')
        page.locator('#actionSubmitBtn').click()
        assert arrived.wait(10), 'Synthetic model request did not arrive'
        expect(page.locator('#waitNotice')).to_be_visible()
        expect(page.locator('#saveQuickBtn')).to_be_disabled()
        expect(page.locator('#actionSubmitBtn')).to_be_disabled()
        expect(page.locator('#localAIModel')).to_be_disabled()
        page.get_by_role('button',name='Journal',exact=True).click()
        expect(page.locator('#tabJournal')).to_be_visible()
        page.get_by_role('button',name='Inventory',exact=True).click()
        page.locator('#inventoryCards').get_by_role('button',name='Inspect',exact=True).first.click()
        choose(page,'Close')
        page.locator('#actionInput').fill('Draft preserved during the wait.')
        page.keyboard.press('Control+s')
        expect(page.locator('#actionInput')).to_have_value('Draft preserved during the wait.')
        page.screenshot(path=str(output/'model-wait.png'),full_page=True)
        release.set()
        expect(page.locator('#waitNotice')).to_be_hidden(timeout=10000)
        expect(page.locator('#actionInput')).to_have_value('Draft preserved during the wait.')
        assert len(requests)==1
        page.locator('#actionInput').fill('')
    finally:
        release.set()
        try:
            data=json.dumps({'config':original}).encode()
            with urlopen(Request(base+'/api/ai/settings',data=data,headers={'Content-Type':'application/json','Origin':base}),timeout=5):
                pass
        finally:
            model.shutdown();model.server_close()
