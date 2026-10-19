"""Regression smoke test using an isolated Chromium document (no server needed)."""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parent.parent
async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=await browser.new_page(viewport={'width':1400,'height':1100})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    await page.set_content(html)
    await page.add_style_tag(content=(BASE/'pedigree.css').read_text())
    await page.evaluate("() => {window.fetch=async()=>({text:async()=>JSON.stringify({ok:true,families:[]})});}")
    await page.add_script_tag(content=(BASE/'pedigree-qc.js').read_text())
    await page.add_script_tag(content=(BASE/'pedigree.js').read_text())
    await page.wait_for_timeout(150)
    for path in sorted((BASE/'examples').glob('*.json')):
      await page.locator('#importJsonInput').set_input_files(str(path))
      await page.wait_for_timeout(120)
      labels=await page.locator('.person[data-uid]').count()
      expect=len(json.loads(path.read_text())['people'])
      assert labels==expect,f'{path.name}: rendered {labels} / expected {expect}'
      assert not errors,f'{path.name}: {errors}'
    await browser.close()
    print(f'OK: {len(list((BASE/"examples").glob("*.json")))} pedigrees imported & rendered with no browser exceptions')
asyncio.run(main())
