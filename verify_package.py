#!/usr/bin/env python3
import hashlib,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parent
files=json.loads((root/'SOURCE_SHA256.json').read_text(encoding='utf-8'))['files']
bad=[p for p,h in files.items() if not (root/p).is_file() or hashlib.sha256((root/p).read_bytes()).hexdigest().lower()!=h.lower()]
actual={p.relative_to(root).as_posix() for p in (root/'custom_nodes').rglob('*') if p.is_file()}
bad+=sorted(actual-set(files))
print(json.dumps({'status':'PASS' if not bad else 'FAIL','files':len(files),'errors':bad},ensure_ascii=False))
sys.exit(bool(bad))
