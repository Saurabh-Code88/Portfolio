"""Production editorial geometry/interaction smoke; controller pass suppresses raster draws."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/validation/editorial');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(120000)
 page.add_init_script("for(const n of ['WebGLRenderingContext','WebGL2RenderingContext']){const c=window[n];if(c)for(const m of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])if(c.prototype[m])c.prototype[m]=function(){}}")
 errors=[];console=[];checks=[];geometry=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 page.goto('http://localhost:3001/?ship=on',wait_until='domcontentloaded')
 page.wait_for_selector('.chapter-navigation',state='visible')
 page.wait_for_function("performance.getEntriesByType('resource').some(e=>e.name.includes('/models/station.glb')&&e.responseEnd>0)")
 page.evaluate("async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}")
 def go(i):
  page.evaluate("i=>window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:['hero','toolkit','projects','research','experience','contact'][i],instant:true}}))",i)
  page.wait_for_function("i=>{const j=document.querySelector('[data-horizontal-journey]'),p=j.querySelectorAll('[data-journey-panel]')[i],t=j.querySelector('.horizontal-journey__track');return Math.abs(-new DOMMatrixReadOnly(getComputedStyle(t).transform).m41-p.offsetLeft)<1}",arg=i)
 for w in [1024,1280,1440,1920]:
  page.set_viewport_size({'width':w,'height':800});go(0)
  intro=page.locator('.chapter-introduction').bounding_box();assert intro['x']>=0 and intro['y']+intro['height']<400
  assert page.locator('.chapter-introduction').evaluate("e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'")
  for i in range(1,6):
   go(i);section=page.locator(['#hero','#toolkit','#projects','#research','#experience','#contact'][i]);rect=section.bounding_box();assert rect['y']>=80 and rect['y']+rect['height']<740,(w,i,rect)
   assert section.evaluate("e=>getComputedStyle(e).borderLeftWidth==='0px'&&getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'")
   geometry.append({'width':w,'chapter':i,'rect':rect})
  print('LAYOUT',w,flush=True)
 checks.append('all six chapter bounds at 1024/1280/1440/1920; transparent surfaces and no section side borders')
 page.set_viewport_size({'width':1280,'height':800});go(0)
 page.wait_for_timeout(2500)
 page.mouse.move(640,630);page.wait_for_function("document.documentElement.classList.contains('model-grab-hover')")
 page.mouse.down();page.mouse.move(710,610,steps=10);page.mouse.up();checks.append('Home station raycast pointer access and drag gesture')
 go(2);assert page.locator('.editorial-project').count()==5
 assert page.locator('.editorial-project .project-actions button:disabled').count()==5
 assert page.locator('.editorial-project .project-actions a').count()==5
 nested=page.locator('#projects').evaluate('e=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0}');assert nested
 page.locator('#projects').evaluate('e=>e.scrollTop=0');page.locator('.editorial-architecture summary').first.click();assert page.locator('.editorial-architecture').first.get_attribute('open') is not None
 checks.append('five source-backed case studies, disabled absent demos, nested scrolling and native architecture disclosure')
 go(1);page.locator('.chapter-navigation .chapter-button').focus();page.keyboard.press('Enter');page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Projects')")
 page.locator('.chapter-previous').click();page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Toolkit')");checks.append('keyboard Next and Previous navigation')
 # Native scroll handoff, forward and reverse.
 for i in [3,2]:
  page.evaluate("i=>{window.dispatchEvent(new WheelEvent('wheel',{deltaY:0}));const j=document.querySelector('[data-horizontal-journey]'),d=j.dataset;window.scrollTo({top:Number(d.scrollStart)+(i*innerWidth)/Number(d.horizontalDistance)*Number(d.verticalDistance),behavior:'instant'})}",i)
  page.wait_for_function("i=>document.querySelector('.chapter-navigation__identity span').textContent.includes(['Home','Toolkit','Projects','Research','Experience','Contact'][i])",arg=i)
 checks.append('manual forward and reverse journey scrolling')
 go(5);page.get_by_role('button',name='Return to Station',exact=False).click();page.wait_for_function("document.body.hasAttribute('data-station-return')");page.wait_for_function("!document.body.hasAttribute('data-station-return')")
 assert page.locator('.chapter-introduction').is_visible();assert not page.locator('.station-return__controls').count();checks.append('unchanged Return to Station completes and cleans up')
 for icon in Path('public/icons/technology').glob('*.svg'):
  response=page.request.get('http://localhost:3001/icons/technology/'+icon.name);assert response.status==200;assert '<svg' in response.text()
 checks.append('all 16 local SVG routes return HTTP200')
 assert not any(('simpleicons.org' in r['name'] or 'devicon' in r['name']) and '/icons/technology/' not in r['name'] for r in page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name}))"));checks.append('no runtime icon CDN requests')
 for w in [375,768]:
  page.set_viewport_size({'width':w,'height':800});page.goto('http://localhost:3001/',wait_until='domcontentloaded');assert page.locator('.site-nav').is_visible();assert not page.locator('.editorial-projects').is_visible();assert page.locator('.project-list.portfolio-original').is_visible();checks.append(f'{w}px original navigation and project layout')
 page.set_viewport_size({'width':1280,'height':800});page.emulate_media(reduced_motion='reduce');page.goto('http://localhost:3001/',wait_until='domcontentloaded');assert not page.locator('.editorial-projects').is_visible();checks.append('normal URL reduced-motion fallback')
 page.emulate_media(reduced_motion='no-preference');page.goto('http://localhost:3001/?ship=off',wait_until='domcontentloaded');assert not page.locator('.editorial-projects').is_visible();assert page.locator('#hero .hero-action').first.is_visible();checks.append('canvas-disabled readable fallback')
 report={'mode':'production controller/layout; raster draws suppressed, not a visual GPU test','checks':checks,'geometry':geometry,'pageErrors':errors,'consoleErrors':console}
 (out/'production.json').write_text(json.dumps(report,indent=2));assert not errors and not console,(errors,console)
 print('ALL_CHECKS',len(checks),flush=True);b.close()
