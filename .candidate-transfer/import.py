"""One-time hash-verified transport of an approved review patch.

Only stores Git blobs/tree. Never changes a branch, merges, publishes, or deploys.
Transport files/workflow are not included in the candidate tree.
"""
import base64
import bz2
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

REPO = 'curtistankiatming/AI-DnD-GM'
BASE = '5e34236c4c840ab512912f05e3a5ccbfbda7b12f'
BASE_TREE = '1698292f99770a45c3eaa45214bee3055af53eb7'
EXPECTED = '5d534084fe11f34410c6156fd88a83c5f0e203a5'
PATCH_HASH = 'da06cbef033fc24724e4a7d99c1983828e3daae1ac0c008893e5164c03a9318b'
COMPRESSED_HASH = 'dd77e7cab8a374d1c09966890b40971db3866a959f46ea297b13724a4c9508f4'
root = Path.cwd()
assert os.environ.get('GITHUB_REPOSITORY') == REPO
parts = [root / '.candidate-transfer' / f'part-{i:02}.txt' for i in range(10)]
compressed = base64.b64decode(''.join(p.read_text('ascii') for p in parts), validate=True)
assert hashlib.sha256(compressed).hexdigest() == COMPRESSED_HASH, 'Transport checksum mismatch'
patch = bz2.decompress(compressed)
assert len(patch) == 200940 and hashlib.sha256(patch).hexdigest() == PATCH_HASH

def git(*args, cwd=root):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()

assert git('rev-parse', BASE + '^{tree}') == BASE_TREE
with tempfile.TemporaryDirectory(prefix='briarwatch-reviewed-import-') as tmp:
    candidate = Path(tmp) / 'candidate'
    subprocess.run(['git', 'worktree', 'add', '--detach', str(candidate), BASE], check=True)
    patchfile = Path(tmp) / 'review.patch'
    patchfile.write_bytes(patch)
    subprocess.run(['git', 'apply', '--check', str(patchfile)], cwd=candidate, check=True)
    subprocess.run(['git', 'apply', '--index', str(patchfile)], cwd=candidate, check=True)
    actual = git('write-tree', cwd=candidate)
    assert actual == EXPECTED, f'Candidate tree mismatch: {actual}'
    print('VERIFIED_CANDIDATE_TREE=' + actual, flush=True)
    # Token is never inherited by candidate tests, which use only local mocks.
    env = {k: v for k, v in os.environ.items() if k != 'IMPORT_TOKEN'}
    for args in [['npm', 'run', 'check'], ['npm', 'test'], ['npm', 'run', 'build:public']]:
        subprocess.run(args, cwd=candidate, env=env, check=True)
    assert git('write-tree', cwd=candidate) == EXPECTED
    elements = []
    changes = git('diff', '--cached', '--name-status', '--no-renames', BASE, cwd=candidate)
    for line in changes.splitlines():
        status, filename = line.split('\t')
        if status == 'D':
            elements.append({'path': filename, 'mode': '100644', 'type': 'blob', 'sha': None})
        else:
            mode = git('ls-files', '--stage', '--', filename, cwd=candidate).split()[0]
            assert mode in ('100644', '100755')
            elements.append({'path': filename, 'mode': mode, 'type': 'blob',
                             'content': (candidate / filename).read_bytes().decode('utf-8')})
    assert len(elements) == 44, f'Unexpected change count: {len(elements)}'
    payload = json.dumps({'base_tree': BASE_TREE, 'tree': elements}).encode()
    request = urllib.request.Request('https://api.github.com/repos/' + REPO + '/git/trees',
        data=payload, method='POST', headers={
        'Authorization': 'Bearer ' + os.environ['IMPORT_TOKEN'],
        'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json',
        'User-Agent': 'Briarwatch-reviewed-source-import', 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=90) as response:
        result = json.load(response)
    assert result['sha'] == EXPECTED, 'Remote candidate tree mismatch'
    print('REMOTE_REVIEW_TREE=' + result['sha'], flush=True)
    print('Stored exact reviewed source; no branch, release, or deployment was changed.')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('Verified alpha2 source tree: `' + EXPECTED + '`\n\n'
                      'Syntax, unit/integration tests and browser build passed. '
                      'No branch updated; browser matrix remains a separate PR gate.\n')
