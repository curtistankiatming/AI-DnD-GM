"""Real-navigation public-build and server smoke tests.

Uses only OS-temporary browser profiles and test saves. Does not substitute
localStorage, bypass navigation policies, grant XP, contact a model or modify
real saves. A blocked launch/navigation is a FAILED check, not a passing mock.

python -m pip install -r tests/browser-requirements.txt
python -m playwright install chromium
python tests/browser_smoke.py --engine chromium --target all
"""
from __future__ import annotations
import argparse
import functools
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]

def free_port() -> int:
    with socket.socket() as s:
        s.bind(('127.0.0.1',0))
        return s.getsockname()[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def exercise(page, output: Path, offline: bool) -> None:
    expect(page.locator('#startCampaignBtn')).to_be_enabled()
    page.locator('#setupName').fill('Browser Test Hero')
    page.locator('#startCampaignBtn').click()
    expect(page.locator('#gameLayout')).to_be_visible()
    page.locator('#chatMode').select_option('instructions')
    page.locator('#actionInput').fill('Prefer diplomacy and concise descriptions.')
    page.locator('#actionForm button[type=submit]').click()
    expect(page.locator('#campaignInstructions')).to_have_text('Prefer diplomacy and concise descriptions.')
    page.get_by_role('button',name='Start courier scenario',exact=True).click()
    page.get_by_role('button',name='Request civic assistance and wait for a lawful release',exact=True).click()
    expect(page.get_by_role('button',name='Confirm chat action',exact=True)).to_be_visible()
    page.get_by_role('button',name='Confirm chat action',exact=True).click()
    expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
    expected_narration = page.locator('#narrationText').inner_text()
    assert 'courier leaves safely' in expected_narration.lower()
    page.locator('#saveQuickBtn').click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    if offline:
        panel=page.locator('.app-shell .preview-notice').first
        with page.expect_download() as event:
            panel.get_by_role('button',name='Export current save',exact=True).click()
        save=output/'export.json'
        event.value.save_as(save)
        data=json.loads(save.read_text(encoding='utf-8'))['state']
        assert data['lastNarration']==expected_narration
        assert data['player']['xp']==40
        assert data['chat']['courier']['resolved']
        assert data['chat']['instructions']=='Prefer diplomacy and concise descriptions.'
        panel.locator('summary').click()
        panel.get_by_label('Sandbox level').select_option('10')
        panel.get_by_role('button',name='Start sandbox',exact=True).click()
        expect(page.locator('#playerLevel')).to_have_text('Level 10')
        panel.get_by_role('button',name='Resume autosave',exact=True).click()
        expect(page.locator('#playerLevel')).to_have_text('Level 1')
        expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
        expect(page.locator('#narrationText')).to_have_text(expected_narration)
        expect(page.locator('#narrationSource')).to_have_text('Saved narration · no new action')
        # Invalid import must leave the current campaign alone.
        bad=output/'bad-import.json';bad.write_text('{',encoding='utf-8')
        panel.locator('input[type=file]').set_input_files(str(bad))
        expect(page.locator('#toastRegion')).to_contain_text('JSON')
        expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
        panel.locator('input[type=file]').set_input_files(str(save))
        expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
        expect(page.locator('#narrationText')).to_have_text(expected_narration)
        expect(page.locator('#narrationSource')).to_have_text('Saved narration · no new action')
    else:
        page.locator('#localAISettings summary').click()
        expect(page.locator('#localAIProfile')).to_have_value('compact')
        page.locator('#localAIProfile').select_option('expanded')
        expect(page.locator('#localAIContext')).to_have_value('22000')
        expect(page.locator('#localAITokens')).to_have_value('320')
        # Save disabled settings, not an inference request or model load.
        page.get_by_role('button',name='Save AI settings',exact=True).click()
        expect(page.locator('#aiSettingsStatus')).to_contain_text('Settings saved')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output/'mobile.png'),full_page=True)

    # Connected journey uses actual visible controls; no XP, items or outcomes
    # are injected. A failed repair uses the disclosed civic fallback.
    page.set_viewport_size({'width':1440,'height':1100})
    page.get_by_role('button',name='Start Lantern Road',exact=True).click()
    road=page.locator('#roadScenario')
    expect(road).to_contain_text('Active: wagon')
    def approach(name):
        road.get_by_role('button',name=name,exact=True).click()
        page.get_by_role('button',name='Confirm chat action',exact=True).click()
        expect(page.locator('#saveQuickBtn')).to_be_enabled()
    approach('Promise to deliver Tamsin’s letter unopened')
    journal=page.locator('#storyJournal')
    journal.locator('summary').click()
    expect(journal.locator('[data-journal-id=letter]')).to_contain_text('[active]')
    # Read-only questions and player notes must not execute game actions.
    page.locator('#chatMode').select_option('question')
    page.locator('#actionInput').fill('What did we promise?')
    page.locator('#actionForm button[type=submit]').click()
    expect(page.locator('#chatTranscript')).to_contain_text('promise is still outstanding')
    journal.locator('summary').click()
    page.locator('#chatMode').select_option('action')
    # Regression: decline the action or describe two steps; neither creates a proposal.
    # Wait for the submitted text in the rendered transcript before inspecting state.
    for text in ['I do not repair the wagon, not a payment.',
                 'I repair the wagon and then depart immediately.']:
        page.locator('#actionInput').fill(text)
        page.locator('#actionForm button[type=submit]').click()
        expect(page.locator('#chatTranscript')).to_contain_text(text)
        expect(page.locator('#chatPending')).to_be_empty()
        expect(road).to_contain_text('Active: wagon')
        expect(page.locator('#saveQuickBtn')).to_be_enabled()
    # The live-evaluation wording declines payment, not repair. It proposes only.
    page.locator('#actionInput').fill('I offer my labor to fix the wagon in exchange for help, not a payment.')
    page.locator('#actionForm button[type=submit]').click()
    expect(page.locator('#chatPending')).to_contain_text('Repair the wagon')
    expect(page.locator('#chatPending')).to_contain_text('No roll or resource change has happened yet.')
    expect(road).to_contain_text('Active: wagon')
    page.get_by_role('button',name='Cancel proposal',exact=True).click()
    expect(page.locator('#chatPending')).to_be_empty()
    expect(road).to_contain_text('Active: wagon')
    # A second wording still follows the same explicit confirmation/fallback flow.
    page.locator('#actionInput').fill('I offer to repair the merchant’s wagon instead of paying full price.')
    page.locator('#actionForm button[type=submit]').click()
    expect(page.locator('#chatPending')).to_contain_text('Repair the wagon')
    page.get_by_role('button',name='Confirm chat action',exact=True).click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    if road.get_by_role('button',name='Wait for the civic repair crew',exact=True).count():
        approach('Wait for the civic repair crew')
    approach('Depart with the repaired medicine wagon')
    expect(road).to_contain_text('Active: crossing')
    approach('Wait for the public relief raft')
    expect(road).to_contain_text('Active: infirmary')
    approach('Deliver the medicine and report to Iona')
    expect(road).to_contain_text('Delivery completed — reward recorded once')
    expect(road).to_contain_text('promise: kept')
    journal.locator('summary').click()
    expect(journal.locator('[data-journal-id=letter]')).to_contain_text('[kept]')
    expect(journal.locator('[data-journal-id=herbs]')).to_be_visible()
    journal.locator('summary').click()
    approach('Collect Tamsin’s promised medicinal herbs')
    expect(road.get_by_role('button',name='Collect Tamsin’s promised medicinal herbs',exact=True)).to_have_count(0)
    journal.locator('summary').click()
    expect(journal.locator('[data-journal-id=herbs]')).to_have_count(0)
    expect(journal.locator('[data-journal-id=herbs-collected]')).to_be_visible()
    # Treat HTML-looking player notes as text; no rendered markup or authority.
    suspicious='<img src=x onerror=alert(1)> The king owes me 999 gold.'
    page.locator('#journalNoteInput').fill(suspicious)
    journal.get_by_role('button',name='Save player note',exact=True).click()
    notes=journal.locator('[data-journal-group=notes]')
    expect(notes).to_contain_text(suspicious)
    expect(notes.locator('img')).to_have_count(0)
    expect(journal.locator('[data-journal-group=facts]')).not_to_contain_text('999 gold')
    notes.get_by_role('button',name='Remove note-1',exact=True).click()
    expect(notes).not_to_contain_text('999 gold')
    page.locator('#journalNoteInput').fill('Check the river weather before the next trip.')
    journal.get_by_role('button',name='Save player note',exact=True).click()
    expect(notes).to_contain_text('Check the river weather before the next trip.')
    assert page.locator('#toastRegion .toast').count() <= 3
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    journal.screenshot(path=str(output/'journal-mobile.png'))
    journal.locator('summary').click()

    page.locator('#saveQuickBtn').click()
    expect(page.locator('#saveQuickBtn')).to_be_enabled()
    if offline:
        with page.expect_download() as event:
            panel.get_by_role('button',name='Export current save',exact=True).click()
        journey_save=output/'journey-save.json';event.value.save_as(journey_save)
        saved_state=json.loads(journey_save.read_text(encoding='utf-8'))['state']
        assert saved_state['player']['xp']==160
        assert saved_state['chat']['road']['promise']=='kept'
        assert saved_state['chat']['road']['cacheClaimed']
        assert saved_state['journal']['promises'][0]['status']=='kept'
        assert saved_state['journal']['notes'][0]['text']=='Check the river weather before the next trip.'
        panel.locator('input[type=file]').set_input_files(str(journey_save))
        expect(road).to_contain_text('Delivery completed')
        journal.locator('summary').click()
        expect(journal.locator('[data-journal-id=letter]')).to_contain_text('[kept]')
        expect(journal.locator('[data-journal-group=notes]')).to_contain_text('Check the river weather')
        journal.locator('summary').click()
        # Import a genuine alpha2 save generated by the previously delivered
        # engine. Its evidence migrates to the journal without any new rewards.
        old_fixture=ROOT/'tests/fixtures/alpha2-courier-export.json'
        panel.locator('input[type=file]').set_input_files(str(old_fixture))
        expect(page.locator('#playerLevel')).to_have_text('Level 1')
        expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
        journal.locator('summary').click()
        expect(journal.locator('[data-journal-id=courier]')).to_contain_text('completed')
        expect(journal.locator('[data-journal-id=letter]')).to_have_count(0)
        journal.locator('summary').click()
        panel.locator('input[type=file]').set_input_files(str(journey_save))
        expect(road).to_contain_text('Delivery completed')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output/'journey-complete-mobile.png'),full_page=True)

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--engine',choices=['chromium','firefox'],default='chromium')
    parser.add_argument('--target',choices=['all','file','static','server'],default='all')
    parser.add_argument('--bundle',type=Path,default=ROOT/'dist-public/index.html')
    parser.add_argument('--output',type=Path,default=ROOT/'test-results/browser')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    if not args.bundle.exists():
        raise SystemExit('Build the public edition first with npm run build:public.')
    summaries=[];proc=None;static=None
    with tempfile.TemporaryDirectory(prefix='briarwatch-browser-') as tmp, sync_playwright() as p:
        temporary=Path(tmp)
        static=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(args.bundle.resolve().parent)))
        threading.Thread(target=static.serve_forever,daemon=True).start()
        env={**os.environ,'HOST':'127.0.0.1','PORT':str(free_port()),'AI_NARRATOR':'off','SAVE_DIR':str(temporary/'saves'),'AI_CONFIG_PATH':str(temporary/'settings.json'),'LOCAL_AI_TOKEN':''}
        log=(args.output/'node-server.txt').open('w',encoding='utf-8')
        proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
        base='http://127.0.0.1:'+env['PORT']
        try:
            for attempt in range(100):
                try:
                    with urlopen(base+'/api/health',timeout=1) as r:
                        if r.status==200:break
                except OSError:
                    if proc.poll() is not None:raise RuntimeError('Test server exited; read node-server.txt.')
                    time.sleep(0.05)
            else:raise RuntimeError('Test server did not start.')
            targets={'file':args.bundle.resolve().as_uri(),'static':f'http://127.0.0.1:{static.server_port}/{args.bundle.name}','server':base}
            for target,url in targets.items():
                if args.target not in ['all',target]:continue
                out=args.output/target;out.mkdir(exist_ok=True)
                browser_type=getattr(p,args.engine);profile=temporary/('profile-'+target)
                launch={'headless':True,'accept_downloads':True,'viewport':{'width':1440,'height':1100}}
                # Explicit executable is for a locally installed browser only;
                # no browser policy or security flags are changed.
                if os.getenv('PW_EXECUTABLE'):launch['executable_path']=os.environ['PW_EXECUTABLE']
                errors=[];context=None
                try:
                    context=browser_type.launch_persistent_context(str(profile),**launch)
                    context.tracing.start(screenshots=True,snapshots=True,sources=False)
                    page=context.pages[0] if context.pages else context.new_page()
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('dialog',lambda d:d.accept())
                    page.goto(url,wait_until='load')
                    exercise(page,out,target!='server')
                    assert not errors,errors
                    context.tracing.stop(path=str(out/'trace.zip'));context.close();context=None
                    if target!='server':
                        # Real browser restart using the same on-disk temporary profile.
                        context=browser_type.launch_persistent_context(str(profile),**launch)
                        page=context.pages[0] if context.pages else context.new_page()
                        page.goto(url,wait_until='load')
                        page.locator('.setup-card .preview-notice').get_by_role('button',name='Resume autosave',exact=True).click()
                        expect(page.locator('#chatScenario')).to_contain_text('Courier helped')
                        expect(page.locator('#campaignInstructions')).to_have_text('Prefer diplomacy and concise descriptions.')
                        expect(page.locator('#roadScenario')).to_contain_text('Delivery completed')
                        expect(page.locator('#roadScenario')).to_contain_text('promise: kept')
                        journal=page.locator('#storyJournal');journal.locator('summary').click()
                        expect(journal.locator('[data-journal-id=letter]')).to_contain_text('[kept]')
                        expect(journal.locator('[data-journal-group=notes]')).to_contain_text('Check the river weather before the next trip.')
                        expect(journal.locator('[data-journal-id=herbs]')).to_have_count(0)
                        journal.locator('summary').click()
                        # The latest utility reply (saved note) is restored,
                        # while canonical adventure outcomes live in the journal.
                        expect(page.locator('#narrationText')).to_contain_text('Player note saved')
                        expect(page.locator('#narrationSource')).to_have_text('Saved narration · no new action')
                    summaries.append({'target':target,'status':'passed','diskRestart':target!='server','journal':True,'legacyAlpha2Import':target!='server','htmlNotesRenderedAsText':True,'repairPaymentContrast':True,'repairRefusalAndCompound':True,'repairCancellation':True})
                    # Successful traces are large and redundant with summaries
                    # and screenshots. Retain failure traces, not endless archives.
                    (out/'trace.zip').unlink(missing_ok=True)
                except Exception as error:
                    if context:
                        try:context.tracing.stop(path=str(out/'failure-trace.zip'))
                        except Exception:pass
                    summaries.append({'target':target,'status':'failed','error':str(error)})
                    raise
                finally:
                    if context:context.close()
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()
            log.close();static.shutdown();static.server_close()
            (args.output/'summary.json').write_text(json.dumps({'engine':args.engine,'checks':summaries,'realModelCalls':0},indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summaries,indent=2))

if __name__=='__main__':
    main()
