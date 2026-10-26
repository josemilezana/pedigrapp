#!/usr/bin/env python3
"""Audit Spanish-looking JavaScript literals (heuristic, never proof of coverage).

The baseline tracks *all* candidate literals, including text already present in
ES dictionaries. This prevents a new hard-coded UI string from evading the gate
merely because its wording also occurs elsewhere in the application.
"""
import json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
literal=re.compile(r'(?s)"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`')
spanish=re.compile(r'[áéíóúñÁÉÍÓÚÑ]|\b(?:los|las|del|para|una|este|esta|selecciona|añadir|familia|individuo|relación|guardar|estado|error|clínic[oa]|embarazo|progenitor|pareja)\b',re.I)
ignored=re.compile(r'\b(?:rgba|linear-gradient|svg|width|height|stroke|fill|viewBox|data-|onclick|className|condition-hover|document\.querySelector|https?://)\b',re.I)

def collect(include_known=False):
    known=set(json.loads((root/'locales/es.json').read_text()).values())
    result=[]
    for filename in ('pedigree.js','pedigree-qc.js','help-data.js','help.js'):
        src=(root/filename).read_text()
        for m in literal.finditer(src):
            val=m.group()[1:-1].strip()
            if len(val)<6 or not spanish.search(val) or ignored.search(val):continue
            if not include_known and val in known:continue
            if len(val)>400 and '<' in val:continue
            line=src.count('\n',0,m.start())+1
            result.append({'file':filename,'line':line,'raw':val,'text':re.sub(r'\s+',' ',val)[:220]})
    return result

items=collect(False)
if __name__=='__main__':
    print('Possible untranslated runtime literals:',len(items))
    for v in items[:15]:print(f'{v["file"]}:{v["line"]}: {v["text"]}')
    if '--json' in sys.argv:
        (root/'scripts/i18n_source_audit.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
    if '--strict' in sys.argv and items:sys.exit(1)
