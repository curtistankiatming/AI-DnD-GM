"""Store one verified UI correction as an immutable blob; never execute game code."""
import base64,hashlib,json,os
from urllib.request import Request,urlopen
URL='https://api.github.com/repos/curtistankiatming/AI-DnD-GM/git/blobs'
HEADERS={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'}
old='e34807636dfec1d2b085be6db976e7d0da95f012'
expected='0997a462d2bf8a1dd0d6c9b47c3ce8639fff5700'
with urlopen(Request(URL+'/'+old,headers=HEADERS),timeout=30) as r: payload=json.load(r)
raw=base64.b64decode(payload['content'])
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==old
text=raw.decode('utf-8');anchor=' const heading=(pane,text,description)=>'
assert text.count(anchor)==1
text=text.replace(anchor,' // Keep destinations attached while moving controls so later ID lookups remain valid.\n main.append(...Object.values(panes));\n'+anchor)
raw=text.encode();assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==expected
with urlopen(Request(URL,data=json.dumps({'content':text,'encoding':'utf-8'}).encode(),headers=HEADERS),timeout=30) as r: result=json.load(r)
assert result['sha']==expected
print('public/adventure-ui.js',expected,'stored. No ref, merge, release or source execution.')
