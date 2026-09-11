"""Hash-verified review-source transport. Creates unreferenced Git trees only.
No branch, merge, release or deployment writes. No workflow-file changes.
"""
import base64, bz2, hashlib, json, os, re, subprocess, tempfile, urllib.request
from pathlib import Path
REPO='curtistankiatming/AI-DnD-GM'
root=Path.cwd()
assert os.environ.get('GITHUB_REPOSITORY')==REPO
assert os.environ.get('GITHUB_REF')=='refs/heads/work/alpha2-source-transfer'
m=json.loads((root/'.candidate-transfer/meta.json').read_text())
for key in ('base','baseTree','expectedTree'):
    assert re.fullmatch('[a-f0-9]{40}',m[key])
for key in ('patchHash','compressedHash'):
    assert re.fullmatch('[a-f0-9]{64}',m[key])
assert 0<m['length']<2000000 and 0<m['changedFiles']<100
assert 0<len(m['partFiles'])<50
for name in m['partFiles']:
    assert re.fullmatch(r'\.candidate-transfer/stage[23]-[0-9]{2}\.txt',name)
compressed=base64.b64decode(''.join((root/name).read_text('ascii') for name in m['partFiles']),validate=True)
assert hashlib.sha256(compressed).hexdigest()==m['compressedHash']
patch=bz2.decompress(compressed)
assert len(patch)==m['length'] and hashlib.sha256(patch).hexdigest()==m['patchHash']
def git(*args,cwd=root):
    return subprocess.check_output(['git',*args],cwd=cwd).decode().strip()
assert git('rev-parse',m['base']+'^{tree}')==m['baseTree']
with tempfile.TemporaryDirectory(prefix='briarwatch-reviewed-import-') as tmp:
    candidate=Path(tmp)/'candidate'
    subprocess.run(['git','worktree','add','--detach',str(candidate),m['base']],check=True)
    p=Path(tmp)/'delta.patch';p.write_bytes(patch)
    subprocess.run(['git','apply','--check',str(p)],cwd=candidate,check=True)
    subprocess.run(['git','apply','--index',str(p)],cwd=candidate,check=True)
    assert git('write-tree',cwd=candidate)==m['expectedTree']
    print('VERIFIED_CANDIDATE_TREE='+m['expectedTree'],flush=True)
    env={k:v for k,v in os.environ.items() if k not in ('IMPORT_TOKEN','GITHUB_SHA')}
    for args in (['npm','run','check'],['npm','test'],['npm','run','build:public']):
        subprocess.run(args,cwd=candidate,env=env,check=True)
    assert git('write-tree',cwd=candidate)==m['expectedTree']
    changes=git('diff','--cached','--name-status','--no-renames',m['base'],cwd=candidate).splitlines()
    assert len(changes)==m['changedFiles']
    elements=[]
    for line in changes:
        status,name=line.split('\t')
        assert not name.startswith(('.github/workflows/','.candidate-transfer/'))
        assert not name.startswith('/') and '..' not in Path(name).parts
        if status=='D':
            elements.append({'path':name,'mode':'100644','type':'blob','sha':None})
        else:
            mode=git('ls-files','--stage','--',name,cwd=candidate).split()[0]
            assert mode in ('100644','100755')
            elements.append({'path':name,'mode':mode,'type':'blob','content':(candidate/name).read_bytes().decode('utf-8')})
    req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/git/trees',data=json.dumps({'base_tree':m['baseTree'],'tree':elements}).encode(),method='POST',headers={'Authorization':'Bearer '+os.environ['IMPORT_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Briarwatch-reviewed-source-import','X-GitHub-Api-Version':'2022-11-28'})
    with urllib.request.urlopen(req,timeout=90) as response:
        result=json.load(response)
    assert result['sha']==m['expectedTree']
    print('REMOTE_REVIEW_TREE='+result['sha'],flush=True)
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as out:
        out.write('Verified source tree: `'+result['sha']+'`\n\nSyntax/tests/build passed. No branch or release updated. Real browser CI remains a separate acceptance gate.\n')
