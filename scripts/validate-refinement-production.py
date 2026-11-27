"""Production smoke using installed Edge / software rendering."""
import json,hashlib,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent.parent/'docs/validation/refinement'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(120000)
 errors=[];console=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 response=page.goto('http://localhost:3001/?ship=on',wait_until='domcontentloaded')
 page.wait_for_function("document.body.classList.contains('space-canvas-active')&&document.querySelector('video')?.readyState>=2")
 def settled(i):
  page.wait_for_function("""i=>{const j=document.querySelector('[data-horizontal-journey]'),p=document.querySelectorAll('[data-journey-panel]')[i],t=j.querySelector('.horizontal-journey__track');return Math.abs(-new DOMMatrixReadOnly(getComputedStyle(t).transform).m41-p.offsetLeft)<1}""",arg=i)
 page.locator('.site-nav a[href="/#projects"]').click();settled(2)
 page.wait_for_function('!document.querySelector("video").seeking')
 page.wait_for_timeout(16000)
 v=page.locator('video').evaluate('v=>v.currentTime')
 first=page.screenshot(path=str(OUT/'production-idle-before.png'),clip={'x':115,'y':245,'width':190,'height':330})
 page.wait_for_timeout(6000)
 second=page.screenshot(path=str(OUT/'production-idle-after.png'),clip={'x':115,'y':245,'width':190,'height':330})
 after=page.locator('video').evaluate('v=>v.currentTime');assert v==after
 assert hashlib.sha256(first).digest()!=hashlib.sha256(second).digest()
 nested=page.locator('#projects').evaluate('el=>{el.scrollTop=el.scrollHeight;return {top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight}}')
 assert nested['total']<=nested['height'] or nested['top']>0
 page.locator('.site-nav a[href="/#toolkit"]').focus();page.keyboard.press('Enter');settled(1)
 page.go_back(wait_until='domcontentloaded');settled(2)
 page.go_forward(wait_until='domcontentloaded');settled(1)
 samples=page.evaluate("""()=>new Promise(resolve=>{const result=[];let last=null,end=performance.now()+4000;const tick=n=>{if(last!==null)result.push(n-last);last=n;if(n<end)requestAnimationFrame(tick);else resolve(result)};requestAnimationFrame(tick)})""")
 scene=page.evaluate("""()=>{const v=document.querySelector('video'),c=document.querySelector('canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {paused:v.paused,autoplay:v.autoplay,loop:v.loop,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown',glError:g.getError(),homeHidden:getComputedStyle(document.querySelector('#hero .hero-panel__content')).display==='none'}}""")
 reduced=b.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce')
 reduced.goto('http://localhost:3001/',wait_until='domcontentloaded')
 reduced.wait_for_selector('#hero .hero-action')
 assert reduced.locator('#hero .hero-action').first.is_visible()
 assert reduced.locator('video').evaluate('v=>!v.getAttribute("src")')
 assert reduced.evaluate("!document.body.classList.contains('space-canvas-active')")
 reduced.close()
 fallback=b.new_page(viewport={'width':1280,'height':800})
 fallback.add_init_script("""(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'||type==='webgl'?null:original.call(this,type,...args)}})()""")
 fallback.goto('http://localhost:3001/',wait_until='domcontentloaded')
 fallback.wait_for_selector('#hero .hero-action')
 assert fallback.locator('#hero .hero-action').first.is_visible()
 assert fallback.evaluate("!document.body.classList.contains('space-canvas-active')")
 fallback.close()
 dev=page.request.get('http://localhost:3001/dev/flight').status
 assert dev==404 and not errors and not console
 report={'status':'passed','http':response.status,'devHttp':dev,'videoBefore':v,'videoAfter':after,'shipCropChanged':True,'nestedProjects':nested,'keyboardNavigation':'passed','historyBackForward':'passed','reducedMotion':'normal URL: static, Home content visible, no canvas','webglUnavailable':'blocked context: meaningful Home content visible','samplesMs':samples,'medianMs':statistics.median(samples),'p95Ms':sorted(samples)[int(len(samples)*.95)],'scene':scene,'pageErrors':errors,'consoleErrors':console}
 (OUT/'production-smoke.json').write_text(json.dumps(report,indent=2))
 b.close();print('PRODUCTION_SMOKE_EXIT=0',flush=True)
