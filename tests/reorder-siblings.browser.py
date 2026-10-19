import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE=Path(__file__).resolve().parent.parent
FIXTURE=BASE/'examples'/'familia01.json'

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=await browser.new_page(viewport={'width':1400,'height':1800},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        html=(BASE/'index.html').read_text()
        import re
        html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
        await page.set_content(html,wait_until='domcontentloaded')
        await page.add_style_tag(content=(BASE/'pedigree.css').read_text())
        await page.evaluate("() => { window.fetch=async()=>({text:async()=>JSON.stringify({ok:true,families:[]})}); }")
        await page.add_script_tag(content=(BASE/'pedigree-qc.js').read_text())
        await page.add_script_tag(content=(BASE/'pedigree.js').read_text())
        await page.wait_for_selector('#pedigreeReorderSiblingsBtn')
        await page.locator('#importJsonInput').set_input_files(str(FIXTURE))
        await page.wait_for_selector('.person[data-uid="P3"]')
        await page.locator('.person[data-uid="P3"]').scroll_into_view_if_needed()
        result=await page.evaluate('''() => [...document.querySelectorAll('.person[data-uid]')].map(n=>({id:n.dataset.uid,transform:n.getAttribute('transform')}))''')
        print('loaded',result[:10], 'errors',errors)
        await page.locator('#pedigreeReorderSiblingsBtn').click()
        assert await page.locator('#pedigreeReorderSiblingsBtn').get_attribute('aria-pressed')=='true'
        points=await page.evaluate('''() => {
          const row=['P3','P4','P5'].map(id=>{const g=document.querySelector(`.person[data-uid="${id}"]`);let b=g.getBoundingClientRect();return {id,x:b.x+b.width/2,y:b.y+b.height/2};});return row;
        }''')
        print('points',points)
        a=next(pt for pt in points if pt['id']=='P3')
        c=next(pt for pt in points if pt['id']=='P5')
        await page.mouse.move(a['x'],a['y'])
        await page.mouse.down()
        await page.mouse.move(c['x']+35,c['y'],steps=15)
        await page.mouse.up()
        await page.wait_for_timeout(500)
        print('after',await page.evaluate('''() => [...document.querySelectorAll('.person[data-uid]')].map(n=>({id:n.dataset.uid,cx:n.getBoundingClientRect().x+n.getBoundingClientRect().width/2})).filter(x=>['P3','P4','P5'].includes(x.id)).sort((a,b)=>a.cx-b.cx)'''))
        # Clic de arrastre no debe abrir el tooltip
        assert await page.locator('#conditionHoverCard').is_hidden()
        # Exportación JSON conserva orden visual y nacimiento
        async with page.expect_download() as download_info:
            await page.locator('#exportJsonBtn').click()
        download=await download_info.value
        dest=BASE/'tests'/'reorder-export-test.json'
        await download.save_as(dest)
        data=json.loads(dest.read_text())
        assert data['schema_version']=='4.16'
        assert data['layout_overrides']['generation_visual_order']['1']==['P4','P5','P3']
        assert [next(p for p in data['people'] if p['uid']==uid).get('birth_order') for uid in ['P3','P4','P5']]==[1,2,3]
        # Deshacer y rehacer sin cambiar filiaciones
        await page.locator('#undoBtn').click()
        async with page.expect_download() as undo_download:
            await page.locator('#exportJsonBtn').click()
        undo_data=BASE/'tests'/'reorder-undo-test.json'
        await (await undo_download.value).save_as(undo_data)
        assert not json.loads(undo_data.read_text())['layout_overrides']['generation_visual_order']
        await page.locator('#redoBtn').click()
        # Restaurar también elimina la reordenación gráfica
        await page.locator('#pedigreeResetManualPositionsBtn').click()
        async with page.expect_download() as reset_download:
            await page.locator('#exportJsonBtn').click()
        reset_data=BASE/'tests'/'reorder-reset-test.json'
        await (await reset_download.value).save_as(reset_data)
        assert not json.loads(reset_data.read_text())['layout_overrides']['generation_visual_order']
        for f in [dest,undo_data,reset_data]: f.unlink(missing_ok=True)
        await page.screenshot(path=str(BASE/'tests'/'reorder-siblings-preview.png'))
        print('errors',errors)
        assert not errors
        await browser.close()

asyncio.run(main())
