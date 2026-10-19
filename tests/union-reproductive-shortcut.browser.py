import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

BASE=Path(__file__).resolve().parent.parent
DATA={
 'schema_version':'4.16', 'family_id':'QC-UNION-074', 'indication':'Test reproductivo de unión',
 'conditions':[], 'people':[
  {'uid':'P1','record_type':'person','gender':'man','label':'Luis'},
  {'uid':'P2','record_type':'person','gender':'woman','label':'Sara'}],
 'relationships':[
  {'type':'union','people':['P1','P2'],'relationship_status':'current','consanguineous':False,
  'reproductive_status':'none','reproductive_attribution':'union','reproductive_reason':''}]
}
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page(viewport={'width':1400,'height':1100},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
  await page.set_content(html,wait_until='domcontentloaded')
  await page.add_style_tag(content=(BASE/'pedigree.css').read_text())
  await page.evaluate('''() => { window.fetch=async()=>({text:async()=>JSON.stringify({ok:true,families:[]})}); }''')
  await page.add_script_tag(content=(BASE/'pedigree-qc.js').read_text())
  await page.add_script_tag(content=(BASE/'pedigree.js').read_text())
  async def import_data(d):
   blob=json.dumps(d,ensure_ascii=False)
   await page.evaluate('''(v)=>{
    const file=new File([v],'case074.json',{type:'application/json'});
    const dt=new DataTransfer();dt.items.add(file);
    const inp=document.getElementById('importJsonInput');inp.files=dt.files;
    inp.dispatchEvent(new Event('change',{bubbles:true}));
   }''',blob)
   await page.wait_for_selector('svg.pedigree-svg .relationship-hit-target',state='attached')

  async def open_menu():
   await page.locator('.relationship-hit-target').first.dispatch_event('click',{'clientX':700,'clientY':300})
   assert await page.locator('.relationship-action-menu').is_visible()
   return page.locator('.relationship-action-menu')

  await import_data(DATA)
  menu=await open_menu()
  assert await menu.get_by_text('Relación finalizada').count()==1
  assert await menu.get_by_text('Relación consanguínea').count()==1
  assert await menu.get_by_label('Situación reproductiva de la pareja').input_value()=='none'
  await menu.get_by_label('Situación reproductiva de la pareja').select_option('infertility')
  assert await menu.get_by_label('A quién corresponde la situación reproductiva').is_visible()
  await menu.get_by_label('A quién corresponde la situación reproductiva').select_option('b')
  await menu.get_by_placeholder('Ej.: azoospermia, vasectomía…').fill('Endometriosis')
  await menu.get_by_role('button',name='Guardar situación reproductiva').click()
  assert await menu.is_hidden()
  assert await page.locator('svg .reproductive-status-bar').count()==2
  assert await page.locator('svg .reproductive-status-reason').count()==1
  assert await page.locator('svg .reproductive-status-reason').text_content()=='Endometriosis'
  # Inspect same data as advanced dialog (no duplication)
  menu=await open_menu()
  assert await menu.get_by_label('Situación reproductiva de la pareja').input_value()=='infertility'
  assert await menu.get_by_label('A quién corresponde la situación reproductiva').input_value()=='b'
  assert await menu.get_by_placeholder('Ej.: azoospermia, vasectomía…').input_value()=='Endometriosis'
  await page.keyboard.press('Escape')
  assert await menu.is_hidden()
  # Distinguish status and test clearing
  menu=await open_menu()
  await menu.get_by_label('Situación reproductiva de la pareja').select_option('no_children')
  await menu.get_by_role('button',name='Guardar situación reproductiva').click()
  assert await page.locator('svg .reproductive-status-bar').count()==1
  menu=await open_menu()
  assert await menu.get_by_label('A quién corresponde la situación reproductiva').input_value()=='b'
  await menu.get_by_label('Situación reproductiva de la pareja').select_option('none')
  assert await menu.get_by_label('A quién corresponde la situación reproductiva').is_hidden()
  await menu.get_by_role('button',name='Guardar situación reproductiva').click()
  assert await page.locator('svg .reproductive-status-bar').count()==0
  await page.locator('#undoBtn').click()
  assert await page.locator('svg .reproductive-status-bar').count()==1
  await page.locator('#redoBtn').click()
  assert await page.locator('svg .reproductive-status-bar').count()==0
  # Prohibited no_children if union already has children
  with_child=json.loads(json.dumps(DATA))
  with_child['people'].append({'uid':'P3','record_type':'person','gender':'woman','label':'Lola'})
  with_child['relationships'].append({'type':'parentage','parents':['P1','P2'],'children':['P3'],'descent_type':'biological'})
  await import_data(with_child)
  menu=await open_menu()
  await menu.get_by_label('Situación reproductiva de la pareja').select_option('no_children')
  await menu.get_by_role('button',name='Guardar situación reproductiva').click()
  assert await menu.is_visible(), 'A failed validation should not dismiss the menu'
  assert await page.locator('svg .reproductive-status-bar').count()==0
  # allowed infertility with registered children
  await menu.get_by_label('Situación reproductiva de la pareja').select_option('infertility')
  await menu.get_by_role('button',name='Guardar situación reproductiva').click()
  assert await page.locator('svg .reproductive-status-bar').count()==2
  async with page.expect_download() as dl:
   await page.locator('#exportJsonBtn').click()
  saved=BASE/'tests'/'union-reproductive-output.json'
  await (await dl.value).save_as(saved)
  exported=json.loads(saved.read_text()); saved.unlink()
  assert exported['schema_version']=='4.16'
  unions=[r for r in exported['relationships'] if r['type']=='union']
  assert len(unions)==1 and unions[0]['reproductive_status']=='infertility'
  assert not errors,errors
  await b.close()
  print('PASS: popup, both options, attribution, reason, drawings, validation, advanced schema, undo/redo, JSON')
asyncio.run(main())
