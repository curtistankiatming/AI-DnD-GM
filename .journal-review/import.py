"""Transport the approved journal delta as readable, hash-checked patch text.

Stores one exact Git tree only. No branch, workflow, merge, release, deployment,
model request, or user-save write. This script is not part of the game candidate.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

REPO = 'curtistankiatming/AI-DnD-GM'
BASE = 'e1bb9f5731f449ede5d39b672fc4e57725385fc5'
BASE_TREE = 'b3ec7937fe88dc974e44296842e5b797aea94cb2'
EXPECTED = 'c51d71893a165bf0f3b7e3f19c939b1beb4fdb4d'
PATCH_SHA256 = '2a36955c63b2c010abf98854a6e87888e08d4ceff44997a86548b73ea9f07d12'
ALLOWED = {
    'CANDIDATE-BASELINE.json', 'README.md', 'START-HERE.txt',
    'docs/INTEGRATE-CANDIDATE.md', 'docs/STAGE3-JOURNAL.md', 'package.json',
    'public/app.js', 'public/chat-ui.js', 'public/styles.css',
    'scripts/build-public.js', 'src/chat-runtime.js', 'src/engine.js',
    'src/journal.js', 'src/narrator.js', 'tests/browser_smoke.py',
    'tests/combat-chat-context.test.js',
    'tests/fixtures/alpha2-courier-export.json', 'tests/journal.test.js',
}
assert os.environ.get('GITHUB_REPOSITORY') == REPO
assert os.environ.get('GITHUB_REF') == 'refs/heads/work/journal-validation-transfer'
root = Path.cwd()
patch = b''.join((root / '.journal-review' / f'part-{i:02}.patch').read_bytes() for i in range(7))
assert len(patch) == 72691
assert hashlib.sha256(patch).hexdigest() == PATCH_SHA256, 'Patch checksum mismatch'

def git(*args, cwd=root):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()

assert git('rev-parse', BASE + '^{tree}') == BASE_TREE
with tempfile.TemporaryDirectory(prefix='briarwatch-journal-review-') as tmp:
    candidate = Path(tmp) / 'candidate'
    subprocess.run(['git', 'worktree', 'add', '--detach', str(candidate), BASE], check=True)
    patchfile = Path(tmp) / 'journal.patch'
    patchfile.write_bytes(patch)
    subprocess.run(['git', 'apply', '--unidiff-zero', '--check', str(patchfile)], cwd=candidate, check=True)
    subprocess.run(['git', 'apply', '--unidiff-zero', '--index', str(patchfile)], cwd=candidate, check=True)
    assert git('write-tree', cwd=candidate) == EXPECTED, 'Candidate source differs from delivered ZIP'
    names = git('diff', '--cached', '--name-only', '--no-renames', BASE, cwd=candidate).splitlines()
    assert set(names) == ALLOWED and len(names) == len(ALLOWED)
    print('VERIFIED_JOURNAL_TREE=' + EXPECTED, flush=True)
    # Candidate code receives no GitHub write token; no model is enabled.
    env = {k: v for k, v in os.environ.items() if k not in ('IMPORT_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_SHA')}
    env.update({'AI_NARRATOR': 'off', 'LOCAL_AI_TOKEN': '', 'OPENAI_API_KEY': ''})
    for args in (['npm', 'run', 'check'], ['npm', 'test'], ['npm', 'run', 'build:public']):
        subprocess.run(args, cwd=candidate, env=env, check=True)
    assert git('write-tree', cwd=candidate) == EXPECTED
    entries = []
    for name in sorted(ALLOWED):
        mode, sha, stage = git('ls-files', '--stage', '--', name, cwd=candidate).split()[:3]
        assert mode == '100644' and stage == '0'
        raw = subprocess.check_output(['git', 'show', ':' + name], cwd=candidate)
        entries.append({'path': name, 'mode': mode, 'type': 'blob', 'content': raw.decode('utf-8')})
    req = urllib.request.Request('https://api.github.com/repos/' + REPO + '/git/trees',
        data=json.dumps({'base_tree': BASE_TREE, 'tree': entries}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + os.environ['IMPORT_TOKEN'],
                 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json',
                 'User-Agent': 'Briarwatch-journal-review', 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(req, timeout=90) as response:
        result = json.load(response)
    assert result['sha'] == EXPECTED
    print('REMOTE_JOURNAL_TREE=' + result['sha'], flush=True)
    print('Only unreferenced source objects stored; browser acceptance still pending.', flush=True)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as report:
        report.write('Exact delivered journal source verified: `' + EXPECTED + '`\n\n'
                     'Syntax, unit/integration tests, and browser build passed. '
                     'No branch, release, deployment or workflow updated. '
                     'PR browser validation must run on the journal commit separately.\n')
