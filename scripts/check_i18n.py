#!/usr/bin/env python3
"""Validate locale schema, duplicate keys, placeholders, references and coverage."""
import argparse,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--strict',action='store_true');p.add_argument('--gate',action='store_true',help='Fail on newly introduced untranslated literals or legacy-style keys');args=p.parse_args()
errors=[];warnings=[]

def load(path):
 def pairs(data):
  d={}
  for k,v in data:
   if k in d:errors.append(f'Duplicate: {k} in {path.name}')
   d[k]=v
  return d
 try:return json.loads(path.read_text(),object_pairs_hook=pairs)
 except Exception as e:errors.append(f'Invalid JSON {path}: {e}');return {}
es=load(root/'locales/es.json');en=load(root/'locales/en.json')
# Generated runtime translations must match canonical JSON, not merely match key sets.
if args.gate or args.strict:
 try:
  from subprocess import run
  check=run([sys.executable,str(root/'scripts/build_locale_bundle.py'),'--check'],capture_output=True,text=True)
  if check.returncode:errors.append('Stale locale runtime bundle: '+(check.stderr or check.stdout).strip())
 except Exception as e:errors.append(f'Locale runtime bundle check failed: {e}')
for k in sorted(set(es)-set(en)):errors.append(f'Missing EN: {k}')
for k in sorted(set(en)-set(es)):errors.append(f'Missing ES: {k}')
for k in sorted(set(es)&set(en)):
 if not all(isinstance(d[k],str) and d[k].strip() for d in [es,en]):errors.append(f'Empty translation: {k}')
 if set(re.findall(r'\{(\w+)\}',es[k]))!=set(re.findall(r'\{(\w+)\}',en[k])):errors.append(f'Placeholder mismatch: {k}')
 if es[k]==en[k] and re.search('[áéíóúñÁÉÍÓÚÑ]',es[k]):warnings.append(f'Identical untranslated locale: {k}')
used=set()
for path in (root/'index.html',root/'help.html',root/'pedigree.js',root/'pedigree-qc.js',root/'help.js'):
 s=path.read_text();used.update(re.findall(r'data-i18n(?:-(?:title|aria-label|placeholder))?=["\']([^"\']+)',s))
 used.update(re.findall(r'(?<![\w.])t\(["\']([\w.]+)["\']',s))
# Attribute keys interpolated from bounded enums cannot be static regex references.
# Validate all their known expansions explicitly below.
used={key for key in used if '${' not in key}
for prefix, values in [
 ('condition.inheritance.', ('autosomal_dominant','autosomal_recessive','x_linked_dominant','x_linked_recessive','mitochondrial','unknown')),
 ('condition.color.', ('black','red','blue','green','orange','purple')),
 ('condition.texture.', ('crosshatch','diagonal','horizontal','vertical','dots')),
]:
 for value in values:
  if prefix+value not in es: errors.append('Missing dynamic-key expansion: '+prefix+value)
for key in sorted(used-set(es)):
 if not key.endswith('.'):errors.append(f'Unknown key: {key}')
coverage=json.loads((root/'scripts/i18n_coverage.json').read_text())
missing=coverage.get('untranslated_static',[])
if missing:warnings.append(f'{len(missing)} static elements without translation')
# Strict releases also prohibit candidate untranslated strings in runtime source.
if args.gate or args.strict:
 from collections import Counter
 try:
  from audit_untranslated import collect
  baseline=json.loads((root/'scripts/i18n_literal_baseline.json').read_text())
  allowed=Counter({(item['file'],item['literal']):item['occurrences'] for item in baseline})
  actual=Counter((item['file'],item['raw']) for item in collect(include_known=True))
  new=actual-allowed
  if new:
   for (filename, literal),n in list(new.items())[:20]:
    errors.append(f'New JS literal requires explicit i18n migration: {filename} ({n}x) {literal[:85]!r}')
 except Exception as e: errors.append(f'Literal regression gate failed: {e}')
 try:
  allowedKeys=set(json.loads((root/'scripts/i18n_legacy_key_baseline.json').read_text()))
  newLegacy={k for k in es if k.startswith('legacy.ui_') or k.startswith('app.body1.')} - allowedKeys
  if newLegacy:errors.append(f'New nonsemantic translation keys are prohibited: {sorted(newLegacy)[:12]}')
 except Exception as e:errors.append(f'Legacy-key regression gate failed: {e}')
if args.strict:
 try:
  from audit_untranslated import items
  reviewed=json.loads((root/'scripts/i18n_reviewed_exceptions.json').read_text())
  registry={}
  for entry in reviewed:
   tag=(entry['file'],entry['literal'])
   if tag in registry:errors.append(f'Duplicate audit exception: {tag[0]} {tag[1][:70]}')
   if not entry.get('reason','').strip():errors.append(f'No justification for audit exception: {tag[0]}')
   registry[tag]=entry['reason']
  candidates={(item['file'],item['raw']) for item in items}
  for fn,literal in sorted(candidates-set(registry)):
   errors.append(f'Unreviewed runtime literal: {fn}: {literal[:110]}')
  for fn,literal in sorted(set(registry)-candidates):
   errors.append(f'Stale audit exception must be removed: {fn}: {literal[:110]}')
  # QC-specific check: all warning codes with bilingual output must have
  # both a title and detail; source text remains a fallback for Node tests.
  qcsource=(root/'pedigree-qc.js').read_text()
  codes=set(re.findall(r"qci\(\s*['\"]qc\.issue\.([A-Z0-9_]+)\.detail",qcsource))
  for code in codes:
   for kind in ('title','detail'):
    if 'qc.issue.'+code+'.'+kind not in es:errors.append(f'QC locale missing {code}.{kind}')
  print(f'Reviewed runtime exceptions={len(candidates)}, QC bilingual codes={len(codes)}')
 except Exception as e:
  errors.append(f'Runtime source audit failed: {e}')
 if warnings: errors.extend(warnings)
print(f'ES keys={len(es)}, EN keys={len(en)}, references={len(used)}, untranslated static={len(missing)}')
for x in warnings[:12]:print('WARNING',x)
for x in errors[:12]:print('ERROR',x)
print('PASS' if not errors else 'FAIL')
sys.exit(1 if errors else 0)
