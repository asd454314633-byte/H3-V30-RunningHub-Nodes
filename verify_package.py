#!/usr/bin/env python3
"""Check private bundle file integrity; no installs, execution, network, or user data reads."""
import hashlib, json, pathlib, sys
root=pathlib.Path(__file__).resolve().parent
m=json.loads((root/'SOURCE_SHA256.json').read_text('utf-8'))
expected=set(m['files'])
actual={str(p.relative_to(root)).replace('\\','/') for p in (root/'custom_nodes').rglob('*') if p.is_file()}
fail=[]
if actual!=expected:fail.append({'code':'INVENTORY_MISMATCH','missing':sorted(expected-actual),'extra':sorted(actual-expected)})
for name,sha in sorted(m['files'].items()):
 p=root.joinpath(*name.split('/'))
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=sha:fail.append({'code':'HASH_MISMATCH','path':name})
patch=m['conditional_patch'];p=root.joinpath(*patch['path'].split('/'))
if not p.is_file():fail.append({'code':'PATCH_MISSING'})
else:
 b=p.read_bytes();gitsha=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if gitsha!=patch['git_blob_sha1']:fail.append({'code':'PATCH_GIT_BLOB_MISMATCH'})
for p in root.rglob('*'):
 if p.is_file() and (p.suffix.lower()=='.json' and 'workflow' in p.name.lower() or p.suffix.lower() in ('.safetensors','.ckpt','.gguf','.pt','.pth')):fail.append({'code':'FORBIDDEN_PAYLOAD','path':str(p.relative_to(root))})
print(json.dumps({'status':'PASS' if not fail else 'FAIL','source_files':len(expected),'failed':fail},ensure_ascii=False));sys.exit(bool(fail))
