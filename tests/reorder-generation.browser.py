import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parent.parent
fixture={
 'schema_version':'4.16','family_id':'T73','indication':'Reordenación horizontal con pareja y dos donantes',
 'conditions':[], 'people':[
 {'uid':'P1','record_type':'person','gender':'man','label':'Padre'},
 {'uid':'P2','record_type':'person','gender':'woman','label':'Madre'},
 {'uid':'P3','record_type':'person','gender':'woman','label':'Hija 1','birth_order':1},
 {'uid':'P4','record_type':'person','gender':'woman','label':'Hija 2','birth_order':2},
 {'uid':'P5','record_type':'person','gender':'woman','label':'Hija 3','birth_order':3,'generation_override':2},
 {'uid':'P6','record_type':'ovum_donor','gender':'woman','sex_at_birth':'female','label':'Donante óvulos','donation_target':'P5'},
 {'uid':'P7','record_type':'sperm_donor','gender':'man','sex_at_birth':'male','label':'Donante esperma','donation_target':'P5'},
 ],
 'relationships':[{'type':'union','people':['P1','P2'],'relationship_status':'current'},
                  {'type':'parentage','parents':['P1','P2'],'children':['P3','P4'],'descent_type':'biological'}]
}
FILE=BASE/'examples'/'T73_reordenar_generacion_donantes.json'
FILE.write_text(json.dumps(fixture,ensure_ascii=False,indent=2))
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1450,'height':1100},accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', (BASE/'index.html').read_text())
  await page.set_content(html,wait_until='domcontentloaded')
  await page.add_style_tag(content=(BASE/'pedigree.css').read_text())
  await page.evaluate('''() => { window.fetch=async()=>({text:async()=>JSON.stringify({ok:true,families:[]})}); }''')
  await page.add_script_tag(content=(BASE/'pedigree-qc.js').read_text())
  await page.add_script_tag(content=(BASE/'pedigree.js').read_text())
  await page.locator('#importJsonInput').set_input_files(str(FILE))
  await page.wait_for_selector('.person[data-uid="P7"]')
  def_label=lambda i: f'I-{i}'
  async def positions():
   return await page.evaluate('''() => Object.fromEntries([...document.querySelectorAll('.person[data-uid]')].map(n=>{const b=n.getBoundingClientRect(); return [n.dataset.uid,{x:b.x+b.width/2,y:b.y+b.height/2,number:n.getAttribute('aria-label')?.split(' ·')[0]}]}))''')
  before=await positions()
  print('Before', {k:before[k] for k in ['P1','P2','P6','P7']})
  assert abs(before['P1']['y']-before['P6']['y']) < 5
  await page.locator('svg.pedigree-svg').screenshot(path=str(BASE/'tests'/'T73_before.png'))
  await page.locator('#pedigreeReorderSiblingsBtn').click()
  assert await page.locator('#pedigreeReorderSiblingsBtn').get_attribute('aria-pressed')=='true'
  async def move(src,dst,dx=-20):
   points=await positions()
   a,b=points[src],points[dst]
   await page.mouse.move(a['x'],a['y']);await page.mouse.down()
   await page.mouse.move(b['x']+dx,b['y'],steps=20);await page.mouse.up()
   await page.wait_for_timeout(170)
  # Donante óvulos pasa a la izquierda de toda la pareja
  leftmost=min(['P1','P2'],key=lambda k:before[k]['x'])
  await move('P6',leftmost,-22)
  one=await positions();print('One', {k:one[k] for k in ['P1','P2','P6','P7']})
  assert one['P6']['x']<one['P1']['x']<one['P2']['x']
  # Donante esperma se coloca a la izquierda del bloque de pareja,
  # pero a la derecha de la donante de óvulos
  await move('P7','P1',-15)
  two=await positions();print('Two', {k:two[k] for k in ['P1','P2','P6','P7']})
  assert two['P6']['x']<two['P7']['x']<two['P1']['x']<two['P2']['x']
  assert len(set(round(two[k]['x']) for k in ['P1','P2','P6','P7']))==4
  assert abs((two['P2']['x']-two['P1']['x'])-(before['P2']['x']-before['P1']['x'])) < 2, 'La pareja no debe estirarse'
  await page.locator('svg.pedigree-svg').screenshot(path=str(BASE/'tests'/'T73_after.png'))
  assert max(two[k]['y'] for k in ['P1','P2','P6','P7'])-min(two[k]['y'] for k in ['P1','P2','P6','P7'])<3
  assert await page.locator('#conditionHoverCard').is_hidden()
  async with page.expect_download() as down:
   await page.locator('#exportJsonBtn').click()
  path=BASE/'tests'/'reorder-generation-output.json'
  await (await down.value).save_as(path)
  data=json.loads(path.read_text())
  assert data['schema_version']=='4.16'
  assert data['layout_overrides']['generation_visual_order']['0']==['P6','P7','P1','P2']
  assert [(r['type'],r.get('people'),r.get('parents'),r.get('children')) for r in data['relationships']]==[(r['type'],r.get('people'),r.get('parents'),r.get('children')) for r in fixture['relationships']]
  assert [next(p for p in data['people'] if p['uid']==uid).get('birth_order') for uid in ['P3','P4','P5']]==[1,2,3]
  await page.locator('#undoBtn').click()
  afterundo=await positions(); assert afterundo['P6']['x'] < afterundo['P1']['x'] < afterundo['P2']['x'] < afterundo['P7']['x']
  await page.locator('#redoBtn').click()
  afterredo=await positions(); assert afterredo['P6']['x'] < afterredo['P7']['x'] < afterredo['P1']['x'] < afterredo['P2']['x']
  # reimportación guarda orden
  await page.locator('#importJsonInput').set_input_files(str(path))
  imported=await positions(); assert imported['P6']['x'] < imported['P7']['x'] < imported['P1']['x'] < imported['P2']['x']
  await page.screenshot(path=str(BASE/'tests'/'reorder-generation-preview.png'))
  await page.locator('#pedigreeResetManualPositionsBtn').click()
  reset=await positions(); assert reset['P1']['x'] < reset['P2']['x'] < reset['P6']['x'] < reset['P7']['x']
  path.unlink(missing_ok=True)
  assert not errors,errors
  await browser.close()
  print('OK: move anywhere on same generation, couples grouped, undo, redo, JSON import/export, reset, no tooltip')
asyncio.run(main())
