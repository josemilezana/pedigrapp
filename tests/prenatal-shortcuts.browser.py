from pathlib import Path
import asyncio, re, shutil
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent

async def main():
  async with async_playwright() as p:
    executable=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    assert executable, 'Chromium no encontrado'
    browser=await p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1536,'height':980})
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    html=re.sub(r'<script src="[^"]+"\s*></script>', '', (ROOT/'index.html').read_text())
    await page.set_content(html)
    await page.add_style_tag(content=(ROOT/'pedigree.css').read_text())
    await page.evaluate('src=>window.eval(src)',(ROOT/'pedigree-qc.js').read_text())
    source=(ROOT/'pedigree.js').read_text()
    idx=source.rfind('})();')
    assert idx>0
    source=source[:idx]+'''window.__prenatalTest={getFamily:()=>family, personByUid, quickDefaultPerson, quickDefaultUnion, renderPedigree, buildConditionHoverCard, showConditionHoverCardForMouse, undo:()=>undoHistory.length};\n'''+source[idx:]
    await page.evaluate('src=>window.eval(src)',source)
    await page.locator('#quickAddCoupleFetusBtn').click()
    data=await page.evaluate('''()=>({
      people:window.__prenatalTest.getFamily().people,
      rels:window.__prenatalTest.getFamily().relationships,
      undos:window.__prenatalTest.undo()
    })''')
    assert len(data['people'])==3, data
    father,mother,fetus=data['people']
    assert father['record_type']=='person' and father['gender']=='man' and father['sex_at_birth']=='male'
    assert mother['record_type']=='person' and mother['gender']=='woman' and mother['sex_at_birth']=='female'
    assert fetus['record_type']=='fetus' and fetus['gender']=='unspecified' and fetus['sex_at_birth']==''
    assert fetus['gestational_age_weeks'] is None
    assert any(r['type']=='union' and set(r['people'])=={father['uid'],mother['uid']} for r in data['rels'])
    assert any(r['type']=='parentage' and fetus['uid'] in r['children'] and set(r['parents'])=={father['uid'],mother['uid']} for r in data['rels'])
    assert data['undos']>=1
    print('OK: plantilla padre, madre y feto (3 integrantes, union y filiacion)')

    # El mismo feto mantiene el control rápido del sexo.
    await page.evaluate('uid=>window.__prenatalTest.buildConditionHoverCard(window.__prenatalTest.personByUid(uid))',fetus['uid'])
    button=page.locator('button[aria-label="Cambiar sexo fetal"]')
    assert await button.count()==1
    await button.evaluate('(el)=>el.click()')
    gender=await page.evaluate('uid=>window.__prenatalTest.personByUid(uid).gender',fetus['uid'])
    assert gender=='man', gender
    print('OK: cambio de sexo fetal del feto de la plantilla')

    # Con más de una pareja se muestra Feto, pero NO un selector.
    second=await page.evaluate('''fatherUid=>{
      const x=window.__prenatalTest;
      const other=x.quickDefaultPerson('woman','female');
      x.getFamily().people.push(other);
      x.getFamily().relationships.push(x.quickDefaultUnion(fatherUid,other.uid));
      x.renderPedigree();
      x.showConditionHoverCardForMouse(x.personByUid(fatherUid), {clientX: 250, clientY: 310});
      return other.uid;
    }''',father['uid'])
    assert await page.locator('.condition-hover-multi-fetus').count()==0
    fetus_button=page.locator('button.fetus-child')
    assert await fetus_button.count()==1
    assert await fetus_button.is_enabled()
    await fetus_button.evaluate('(el)=>el.click()')
    parentage=await page.evaluate('''()=>{
      const f=window.__prenatalTest.getFamily();
      const last=f.people.at(-1);
      const related=f.relationships.filter(r=>r.type==='parentage' && r.children.includes(last.uid));
      return {last,related};
    }''')
    assert parentage['last']['record_type']=='fetus'
    assert parentage['last']['gender']=='unspecified'
    parents=set(u for r in parentage['related'] for u in r['parents'])
    assert parents=={father['uid']}, (parents,parentage)
    assert mother['uid'] not in parents and second not in parents
    print('OK: varias parejas -> Feto sin selector y solo filiación del registro seleccionado')
    assert errors==[], errors
    print('OK: sin errores del navegador')
    await browser.close()

asyncio.run(main())
