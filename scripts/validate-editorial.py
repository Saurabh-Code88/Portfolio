import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/validation/editorial');out.mkdir(parents=True,exist_ok=True)
mode=sys.argv[1] if len(sys.argv)>1 else 'after'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(180000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3000/dev/flight?ship=on',wait_until='domcontentloaded')
 page.wait_for_function("document.querySelector('.flight-preview-controls output')?.dataset.stationLoaded==='true'",timeout=240000)
 page.wait_for_selector('.chapter-navigation',state='visible')
 page.evaluate('async()=>{await document.fonts.ready}')
 page.add_style_tag(content='.flight-preview-controls, nextjs-portal {visibility:hidden!important}')
 page.wait_for_function("Number(document.querySelector('.flight-preview-controls output')?.dataset.fps)>0&&Number(document.querySelector('[data-horizontal-journey]')?.dataset.horizontalDistance)>0")
 for i,name in enumerate(['home','toolkit','projects','research','experience','contact']):
  page.evaluate("i=>window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:['hero','toolkit','projects','research','experience','contact'][i],instant:true}}))",i)
  page.wait_for_function("i=>Math.abs(Number(document.querySelector('.flight-preview-controls output').dataset.progress)-i/5)<.00001",arg=i)
  page.wait_for_timeout(2500)
  page.screenshot(path=str(out/f'{mode}-{name}.png'));print(mode,name,flush=True)
 (out/f'{mode}.json').write_text(json.dumps({'errors':errors,'rendering':'native Edge SwiftShader, full raster draws','viewport':[1280,800]}))
 b.close()
