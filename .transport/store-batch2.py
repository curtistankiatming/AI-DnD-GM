"""One-time reviewed source transport. Creates blobs only, no refs or releases."""
import hashlib, json, os, pathlib, subprocess, tempfile
from urllib.request import Request, urlopen
BASE='c86a1bc826d8fd7b1e0c9e9500309ec5ff1af926'
REPO='curtistankiatming/AI-DnD-GM'
EXPECTED={
 'public/index.html':'795c8b699721ca93f8a532e6891a790a2a92907e',
 'scripts/build-public.js':'2077350c2c3d995214a6d601a1304888feab865f',
 'tests/browser_smoke.py':'4cc600d0971a15e7359e27b00816afa50a1f7ef7',
 'tests/response_browser.py':'57a371063ef3fba932524ee8d0cba0156ceaa335',
 'tests/ui_safety_browser.py':'7436f86996f4da9aadf985cc615fb1f90ef93265'
}
patch=pathlib.Path('.transport/batch2-existing.patch').resolve()
assert hashlib.sha256(patch.read_bytes()).hexdigest()=='080942232c0794be7649a53a42ea30834db2deba17351d4bdc00d0fd1ab50685'
with tempfile.TemporaryDirectory(prefix='reviewed-batch2-') as temp:
 work=pathlib.Path(temp)/'source'
 subprocess.run(['git','worktree','add','--detach',str(work),BASE],check=True)
 subprocess.run(['git','apply','--check',str(patch)],cwd=work,check=True)
 subprocess.run(['git','apply',str(patch)],cwd=work,check=True)
 changed=set(subprocess.check_output(['git','diff','--name-only'],cwd=work,text=True).splitlines())
 assert changed==set(EXPECTED),changed
 for name,want in EXPECTED.items():
  data=(work/name).read_bytes();digest=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  assert digest==want,(name,digest,want)
  body=json.dumps({'content':data.decode('utf-8'),'encoding':'utf-8'}).encode()
  req=Request('https://api.github.com/repos/'+REPO+'/git/blobs',data=body,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
  with urlopen(req,timeout=30) as response: result=json.load(response)
  assert result['sha']==want,(name,result)
  print(name,want)
 subprocess.run(['git','worktree','remove','--force',str(work)],check=True)
print('Five reviewed blobs stored. No source execution, ref update, merge or publication.')
