from pathlib import Path
import asyncio,re
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent

async def main():
  async with async_playwright() as p:
    import shutil
    executable=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    browser=await p.chromium.launch(**({'executable_path': executable} if executable else {}),headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1400,'height':1100})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    html=re.sub(r'<script src="[^"]+"\s*></script>', '', (ROOT/'index.html').read_text())
    await page.set_content(html)
    await page.add_style_tag(content=(ROOT/'pedigree.css').read_text())
    await page.evaluate('x=>window.eval(x)',(ROOT/'pedigree-qc.js').read_text())
    source=(ROOT/'pedigree.js').read_text()
    # Temporary test-only hook inside the IIFE; NOT part of the distribution.
    idx=source.rfind('})();')
    assert idx>0
    source=source[:idx]+'''window.__test={getFamily:()=>family,personByUid,buildConditionHoverCard,quickCreateRelativeFromHover,cyclePersonGenderFromHover,resetPersonForm};\n'''+source[idx:]
    await page.evaluate('x=>window.eval(x)',source)
    await page.wait_for_timeout(300)
    print('initial:',await page.evaluate('window.__test.getFamily().people.length'))
    await page.locator('#quickAddCouple1SonBtn').click()
    ids=await page.evaluate('window.__test.getFamily().people.map(p=>p.uid)')
    print('initial IDs',ids)
    target=ids[2]
    controls=await page.evaluate('''uid=>{
        window.__test.buildConditionHoverCard(window.__test.personByUid(uid));
        return [...document.querySelectorAll('.condition-hover-create-shortcuts button')].map(b=>b.className);
    }''',target)
    print('buttons present', [x for x in controls if 'donor' in x])
    assert any('sperm-donor' in x for x in controls)
    assert any('ovum-donor' in x for x in controls)
    await page.locator('.condition-hover-create-shortcut.sperm-donor').evaluate('(el)=>el.click()')
    result=await page.evaluate('window.__test.getFamily().people.at(-1)')
    assert result['record_type']=='sperm_donor' and result['donation_targets']==[target]
    assert result['gender']=='man' and result['sex_at_birth']=='male'
    print('sperm donor pass')
    await page.locator('.condition-hover-create-shortcut.ovum-donor').evaluate('(el)=>el.click()')
    result=await page.evaluate('window.__test.getFamily().people.at(-1)')
    assert result['record_type']=='ovum_donor' and result['donation_target']==target
    assert result['gender']=='woman' and result['sex_at_birth']=='female'
    assert (await page.evaluate('window.__test.getFamily().relationships.filter(r=>r.type==="union").length'))==1
    print('ovum donor pass')
    # Fetus shortcut on mother of one couple
    await page.evaluate('''uid=>window.__test.buildConditionHoverCard(window.__test.personByUid(uid))''',ids[1])
    await page.locator('.condition-hover-create-shortcut.fetus-child').evaluate('(el)=>el.click()')
    f=await page.evaluate('window.__test.getFamily().people.at(-1)')
    assert f['record_type']=='fetus' and f['gender']=='unspecified' and f['sex_at_birth']==''
    assert await page.evaluate('''uid=>window.__test.getFamily().relationships.some(r=>r.type==='parentage' && r.children.includes(uid))''',f['uid'])
    print('fetus defaults pass')
    await page.evaluate('''uid=>window.__test.buildConditionHoverCard(window.__test.personByUid(uid))''',f['uid'])
    b=page.locator('button[aria-label="Cambiar sexo fetal"]')
    assert await b.count()==1
    for expected in ['man','woman','unspecified']:
      await b.evaluate('(el)=>el.click()')
      actual=await page.evaluate('uid=>window.__test.personByUid(uid).gender',f['uid'])
      assert actual==expected, (actual,expected)
    print('fetal sex cycling pass')
    # New donor through main form
    await page.evaluate('()=>window.__test.resetPersonForm()')
    await page.locator('#recordType').evaluate('el=>{el.value="ovum_donor";el.dispatchEvent(new Event("change",{bubbles:true}))}')
    assert await page.locator('#gender').input_value()=='woman'
    assert await page.locator('#sexAtBirth').input_value()=='female'
    await page.locator('#gender').evaluate('el=>{el.value="man";el.dispatchEvent(new Event("change",{bubbles:true}))}')
    await page.locator('#sexAtBirth').evaluate('el=>{el.value="male";el.dispatchEvent(new Event("change",{bubbles:true}))}')
    assert await page.locator('#gender').input_value()=='man'
    assert await page.locator('#sexAtBirth').input_value()=='male'
    await page.locator('#recordType').evaluate('el=>{el.value="fetus";el.dispatchEvent(new Event("change",{bubbles:true}))}')
    assert await page.locator('#fetalSex').input_value()=='unspecified'
    print('main form defaults and editability pass')
    print('uncaught browser errors:',errors)
    assert not errors
    await browser.close()

asyncio.run(main())
