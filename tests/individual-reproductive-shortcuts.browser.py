"""Prueba UI para botones de situación reproductiva individual en el tooltip (0.8.75)."""
import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1400,'height':1100},accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',(ROOT/'index.html').read_text())
  await page.set_content(html)
  await page.add_style_tag(content=(ROOT/'pedigree.css').read_text())
  await page.evaluate('''() => {window.fetch=async()=>({text:async()=>JSON.stringify({ok:true,families:[]})});}''')
  await page.add_script_tag(content=(ROOT/'pedigree-qc.js').read_text())
  js=(ROOT/'pedigree.js').read_text()
  idx=js.rfind('})();')
  assert idx > 0
  js=js[:idx]+'''window.__test075={getFamily:()=>family,personByUid,buildConditionHoverCard,quickAddSinglePerson,renderPedigree,editPerson};\n'''+js[idx:]
  await page.add_script_tag(content=js)
  await page.wait_for_timeout(120)
  await page.evaluate('window.__test075.quickAddSinglePerson("man")')
  uid=await page.evaluate('window.__test075.getFamily().people[0].uid')
  await page.evaluate('''uid=>{
   window.__test075.buildConditionHoverCard(window.__test075.personByUid(uid));
   const card=document.querySelector('.condition-hover-card');
   card.hidden=false;card.setAttribute('aria-hidden','false');
  }''',uid)
  one=page.locator('.condition-hover-create-shortcut.reproductive-individual.no_children')
  two=page.locator('.condition-hover-create-shortcut.reproductive-individual.infertility')
  assert await one.count()==1 and await two.count()==1
  assert await one.get_attribute('aria-pressed')=='false'
  await one.evaluate("el=>el.click()")
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='no_children'
  assert await one.get_attribute('aria-pressed')=='true'
  assert await page.locator('svg .individual-reproductive-status-bar').count()==1
  # Botón activo conmuta; sin tooltip nuevo ni relación añadida.
  await one.evaluate("el=>el.click()")
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='none'
  assert await page.locator('svg .individual-reproductive-status-bar').count()==0
  await two.evaluate("el=>el.click()")
  assert await two.get_attribute('aria-pressed')=='true'
  assert await page.locator('svg .individual-reproductive-status-bar').count()==2
  # Edición avanzada refleja datos introducidos desde los atajos.
  await page.evaluate('uid=>window.__test075.editPerson(uid)',uid)
  assert await page.locator('#personReproductiveStatus').input_value()=='infertility'
  # El motivo se rellena solo en opciones avanzadas.
  await page.locator('#personReproductiveReason').fill('azoospermia')
  await page.locator('#submitPersonBtn').evaluate('el=>el.click()')
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_reason',uid)=='azoospermia'
  await page.evaluate('''uid=>{
   window.__test075.buildConditionHoverCard(window.__test075.personByUid(uid));
   const card=document.querySelector('.condition-hover-card');card.hidden=false;
  }''',uid)
  await page.locator('.condition-hover-create-shortcut.reproductive-individual.no_children').evaluate('el=>el.click()')
  assert await page.evaluate('uid=>[window.__test075.personByUid(uid).reproductive_status,window.__test075.personByUid(uid).reproductive_reason]',uid)==['no_children','']
  assert await page.locator('svg .individual-reproductive-status-bar').count()==1
  await page.locator('#undoBtn').click()
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='infertility'
  await page.locator('#redoBtn').click()
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='no_children'
  # Hijos ya existentes: «No descendencia» no procede, infertilidad sí.
  await page.evaluate('''uid=>{
    const f=window.__test075.getFamily();
    f.people.push({...f.people[0],uid:'CHILD075',label:'Hija',reproductive_status:'none'});
    f.relationships.push({type:'parentage',parents:[uid],children:['CHILD075'],descent_type:'biological'});
    f.people[0].reproductive_status='none';
    window.__test075.renderPedigree();
    window.__test075.buildConditionHoverCard(window.__test075.personByUid(uid));
  }''',uid)
  assert await page.locator('.condition-hover-create-shortcut.reproductive-individual.no_children').is_disabled()
  assert await page.locator('.condition-hover-create-shortcut.reproductive-individual.infertility').is_enabled()
  await page.locator('.condition-hover-create-shortcut.reproductive-individual.infertility').evaluate('(el)=>el.click()')
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='infertility'
  # Persistencia en JSON nativo y nueva importación de la familia.
  async with page.expect_download() as download_event:
   await page.locator('#exportJsonBtn').evaluate('el=>el.click()')
  out=ROOT/'tests'/'individual-reproductive-output075.json'
  await (await download_event.value).save_as(out)
  dumped=json.loads(out.read_text());out.unlink()
  assert dumped['schema_version']=='4.16'
  assert next(p for p in dumped['people'] if p['uid']==uid)['reproductive_status']=='infertility'
  await page.evaluate('''v=>{
    const f=new File([v],'individual075.json',{type:'application/json'});
    const dt=new DataTransfer();dt.items.add(f);
    const inp=document.querySelector('#importJsonInput');inp.files=dt.files;
    inp.dispatchEvent(new Event('change',{bubbles:true}));
  }''',json.dumps(dumped,ensure_ascii=False))
  await page.wait_for_timeout(150)
  assert await page.evaluate('uid=>window.__test075.personByUid(uid).reproductive_status',uid)=='infertility'
  # No ofrecer atajos en registro diferente de persona ordinaria.
  for kind in ['fetus','sab','top','ect','stillbirth','sperm_donor','ovum_donor','gestational_carrier','multiple']:
   await page.evaluate('''(kind)=>{
      const p={...window.__test075.getFamily().people[0],record_type:kind,uid:'SAMPLE075'};
      window.__test075.buildConditionHoverCard(p);
   }''',kind)
   assert await page.locator('.condition-hover-create-shortcut.reproductive-individual').count()==0,kind
  assert not errors,errors
  print('0.8.75: cambio de estado, barras, motivo avanzado, deshacer/rehacer, bloqueo por descendencia y exclusión de 9 tipos: OK')
  await browser.close()

asyncio.run(main())
