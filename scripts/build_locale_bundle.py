#!/usr/bin/env python3
"""Compile the canonical locales/*.json into a synchronously loadable browser bundle.
Run --check in CI; generated file must not be edited manually.
"""
import argparse,json,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
locale={lang:json.loads((root/'locales'/f'{lang}.json').read_text(encoding='utf-8')) for lang in ['es','en']}
assert set(locale['es'])==set(locale['en']), 'ES/EN key mismatch'
out='/* GENERATED: source of truth is locales/es.json and locales/en.json. */\nwindow.PedigrAPPLocales='+json.dumps(locale,ensure_ascii=False,sort_keys=True,separators=(',',':'))+';\n'
path=root/'locales/catalog.js'
if args.check:
 if not path.exists() or path.read_text(encoding='utf-8')!=out:
  sys.exit('FAIL: stale locales/catalog.js; run python3 scripts/build_locale_bundle.py')
 print('PASS: synchronous locale bundle matches canonical JSON')
else:
 path.write_text(out,encoding='utf-8');print('Generated',path,'keys',len(locale['es']))
