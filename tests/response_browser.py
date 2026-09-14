"""Synthetic local-model integration through actual browser controls, never real inference."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from playwright.sync_api import expect


def exercise_response_policy(page, output):
    calls = []
    errors = []
    class Model(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            try:
                assert self.path == '/v1/chat/completions'
                body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                assert body['model'] == 'synthetic-browser-only'
                assert body['max_tokens'] == -1
                assert body['temperature'] == 0.1
                request = json.loads(body['messages'][-1]['content'])
                calls.append(request['mode'])
                if request['playerInput'] == 'Check the action boundary.':
                    reply = {'kind': 'action', 'optionId': 'courier:aid', 'reply': ''}
                else:
                    reply = {'kind': 'dialogue' if request['mode'] == 'question' else 'question',
                             'optionId': '', 'reply': 'Synthetic read-only description.'}
                data = json.dumps({'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(reply)}}]}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception as exc:
                errors.append(str(exc))
                self.send_error(400)

    base = page.url.rstrip('/')
    with urlopen(base + '/api/ai/settings', timeout=5) as response:
        original = json.load(response)['config']
    model = ThreadingHTTPServer(('127.0.0.1', 0), Model)
    threading.Thread(target=model.serve_forever, daemon=True).start()
    try:
        page.locator('#localAIBase').fill(f'http://127.0.0.1:{model.server_port}/v1')
        page.locator('#localAIModel').fill('synthetic-browser-only')
        page.locator('#localAIEnabled').check()
        page.locator('#localAIUncapped').check()
        with page.expect_response(lambda r: r.url.endswith('/api/ai/settings') and r.request.method == 'POST') as saved:
            page.get_by_role('button', name='Save AI settings', exact=True).click()
        assert saved.value.json()['config']['enabled'] is True
        expect(page.locator('#saveQuickBtn')).to_be_enabled()
        results = []
        for mode, text, good in [('question', 'Describe this place.', True),
                                 ('dialogue', 'I greet the people nearby.', True),
                                 ('question', 'Check the action boundary.', False)]:
            page.locator('#chatMode').select_option(mode)
            page.locator('#actionInput').fill(text)
            with page.expect_response(lambda r: r.url.endswith('/api/chat')) as event:
                page.locator('#actionForm button[type=submit]').click()
            response = event.value
            payload = response.json()
            before = json.loads(response.request.post_data)['state']
            after = payload['state']
            for key in ['player', 'party', 'story', 'world', 'combat', 'turnCount']:
                assert before.get(key) == after.get(key), key
            assert not after['chat']['pending']
            expect(page.locator('#chatPending')).to_be_empty()
            expect(page.locator('#saveQuickBtn')).to_be_enabled()
            if good:
                assert response.status == 200
                assert payload['result']['responseType']['adjusted'] is True
                assert payload['result']['kind'] == mode
                expect(page.locator('#chatStatus')).to_contain_text(f'Kept in {mode} mode')
                expect(page.locator('#chatStatus')).to_contain_text('does not verify')
                expect(page.locator('#narrationText')).to_have_text('Synthetic read-only description.')
                page.screenshot(path=str(output / f'{mode}-routing.png'), full_page=True)
            else:
                assert response.status == 422
                expect(page.locator('#chatTranscript')).to_contain_text('cannot spend an action')
            results.append({'mode': mode, 'readOnly': True, 'adjustmentShown': good, 'actionRejected': not good})
        assert len(calls) == 3 and not errors, errors
        (output / 'response-routing.json').write_text(json.dumps({'checks': results, 'mockModelCalls': len(calls), 'realModelCalls': 0}, indent=2), encoding='utf-8')
    finally:
        # Restore the isolated test server's settings, even after an assertion.
        try:
            data = json.dumps({'config': original}).encode()
            with urlopen(Request(base + '/api/ai/settings', data=data, headers={'Content-Type': 'application/json', 'Origin': base}), timeout=5):
                pass
        finally:
            model.shutdown()
            model.server_close()
        page.locator('#localAIEnabled').uncheck()
        page.locator('#localAIUncapped').uncheck()
        page.locator('#localAIBase').fill(original['baseUrl'])
        page.locator('#localAIModel').fill(original['model'])
