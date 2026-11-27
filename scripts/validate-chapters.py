"""Optional native Edge validation; --stress suppresses raster draws for controller tests only."""
import json,sys,time,base64,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent.parent/'docs/validation/chapters'
OUT.mkdir(parents=True,exist_ok=True)
class Checks(list):
 def append(self,item):
  super().append(item);print('CHECK',item,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(120000)
 if '--stress' in sys.argv or '--layout' in sys.argv:
  page.add_init_script("""()=>{}""")
  page.add_init_script("""for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){const c=window[name];if(c)for(const m of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])if(c.prototype[m])c.prototype[m]=function(){}}""")
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 report={'renderer':'Edge SwiftShader; software decode','mode':'controller only; raster draws suppressed' if '--stress' in sys.argv else 'full rendering','checks':Checks(),'poses':[]}
 page.goto('http://localhost:3000/dev/flight?ship=on',wait_until='domcontentloaded')
 diag='.flight-preview-controls output'
 page.wait_for_function("document.querySelector('.flight-preview-controls output')?.dataset.stationLoaded==='true'",timeout=240000)
 page.wait_for_selector('.chapter-navigation',state='visible')
 def data():return page.locator(diag).evaluate('e=>({...e.dataset})')
 def go(i):
  page.wait_for_function("Number(document.querySelector('.flight-preview-controls output')?.dataset.fps)>0&&Number(document.querySelector('[data-horizontal-journey]')?.dataset.horizontalDistance)>0")
  page.evaluate("async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}")
  page.evaluate("i=>window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:['hero','toolkit','projects','research','experience','contact'][i],instant:true}}))",i)
  try:page.wait_for_function("i=>Math.abs(Number(document.querySelector('.flight-preview-controls output').dataset.progress)-i/5)*innerWidth*5<1",arg=i)
  except:
   print('GO_FAILED',i,data(),page.evaluate("({y:scrollY,journey:{...document.querySelector('[data-horizontal-journey]').dataset},canvas:document.body.className})"),flush=True);raise
 def start(actual=False):
  if actual:page.locator('.chapter-navigation button').click()
  else:page.evaluate("window.dispatchEvent(new Event('portfolio:return-station'))")
  page.wait_for_function("document.body.hasAttribute('data-station-return')")
 def done():
  page.wait_for_function("!document.body.hasAttribute('data-station-return')")
  page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.progress)<.00001")
  assert not page.locator('.station-return__controls').count()
  assert page.locator('.station-return').evaluate("e=>getComputedStyle(e).visibility==='hidden'")
 if '--layout' in sys.argv:
  for w in [1024,1280,1440,1920]:
   page.set_viewport_size({'width':w,'height':800});go(0)
   intro=page.locator('.chapter-introduction').bounding_box();assert intro['y']+intro['height']<400
   brand=page.locator('.site-brand').bounding_box();chapter=page.locator('.chapter-navigation').bounding_box();assert brand['x']+brand['width']<chapter['x']-10
   for i in range(1,6):
    go(i);rect=page.locator(['#hero','#toolkit','#projects','#research','#experience','#contact'][i]).bounding_box();assert rect['y']>=80 and rect['y']+rect['height']<=733,rect
    report['poses'].append({'width':w,'chapter':i,'rect':rect})
   print('LAYOUT',w,'intro/header/content bounds passed',flush=True)
  (OUT/'layout.json').write_text(json.dumps(report,indent=2))
  if '--stress' not in sys.argv:b.close();sys.exit(0)
 if '--stress' in sys.argv:
  go(5);start();page.evaluate("window.dispatchEvent(new Event('portfolio:return-station'))");page.locator('.station-return__controls button').click();done();report['checks'].append('repeat + Skip Animation cleanup')
  go(5);start();page.mouse.wheel(0,-80);page.wait_for_function("!document.body.hasAttribute('data-station-return')");report['checks'].append('wheel interruption cleanup')
  go(5);start();page.evaluate("window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:'research',instant:true}}))");page.wait_for_function("!document.body.hasAttribute('data-station-return')");report['checks'].append('programmatic retarget cleanup')
  go(5);start();page.set_viewport_size({'width':1440,'height':800});done();report['checks'].append('resize returns directly to Home')
  go(5);start();page.emulate_media(reduced_motion='reduce');page.wait_for_function("!document.body.hasAttribute('data-station-return')");page.emulate_media(reduced_motion='no-preference');report['checks'].append('reduced-motion change cancels active return')
  go(5);start();page.wait_for_function("document.body.dataset.stationReturn==='preparing'");page.evaluate("document.querySelector('video').dispatchEvent(new Event('error'))");done();report['checks'].append('video failure bounded return')
  go(5);start();page.evaluate("document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost'))");page.wait_for_function("!document.body.hasAttribute('data-station-return')&&!document.body.classList.contains('space-canvas-active')");assert page.locator('#hero .hero-action').first.is_visible();report['checks'].append('context-loss cleanup and readable fallback')
  page.goto('http://localhost:3000/dev/flight?ship=on',wait_until='domcontentloaded');page.wait_for_function("document.querySelector('.flight-preview-controls output')?.dataset.stationLoaded==='true'")
  go(1);page.locator('.chapter-navigation .chapter-button').focus();page.keyboard.press('Enter');page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Projects')");page.locator('.chapter-previous').click();page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Toolkit')");page.go_back(wait_until='domcontentloaded');page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Projects')");page.go_forward(wait_until='domcontentloaded');page.wait_for_function("document.querySelector('.chapter-navigation__identity span').textContent.includes('Toolkit')");report['checks'].append('keyboard, Previous Chapter and history back/forward')
  go(1);page.locator('.chapter-navigation .chapter-button').click();page.wait_for_timeout(100);page.evaluate("window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:'research'}}))");page.mouse.wheel(0,-40);report['checks'].append('rapid ordinary retarget and wheel interruption')
  # Native scroll offsets include deliberate near-anchor arrivals and a reverse trip.
  for i,offset in [(3,30),(2,-25)]:
   page.evaluate("([i,o])=>{window.dispatchEvent(new WheelEvent('wheel',{deltaY:0}));const j=document.querySelector('[data-horizontal-journey]'),d=j.dataset;window.scrollTo({top:Number(d.scrollStart)+(i*innerWidth+o)/Number(d.horizontalDistance)*Number(d.verticalDistance),behavior:'instant'})}",[i,offset])
   page.wait_for_function("i=>document.querySelector('.flight-preview-controls output').dataset.destination===['hero','toolkit','projects','research','experience','contact'][i]&&Number(document.querySelector('.flight-preview-controls output').dataset.idleWeight)>.99",arg=i)
  report['checks'].append('manual forward/reverse off-anchor idle')
  page.goto('http://localhost:3000/dev/flight?ship=on#research',wait_until='domcontentloaded');page.wait_for_function("document.querySelector('.chapter-navigation__identity span')?.textContent.includes('Research')");report['checks'].append('deep link')
 else:
  for w in ([1280] if '--captures' in sys.argv else [1024,1280,1440,1920]):
   page.set_viewport_size({'width':w,'height':800});go(0)
   assert not page.locator('.site-nav').is_visible()
   r=page.locator('.chapter-introduction').bounding_box();assert r['x']>=20 and r['x']+r['width']<w*.4 and r['y']+r['height']<425,r
   for i,name in enumerate(['home','toolkit','projects','research','experience','contact']):
    if w==1280 and i>0 and '--captures' not in sys.argv:
     page.locator('.chapter-navigation .chapter-button').click()
     page.wait_for_function("i=>Math.abs(Number(document.querySelector('.flight-preview-controls output').dataset.progress)-i/5)<.00005",arg=i)
    else:go(i)
    page.wait_for_timeout(1200)
    report['poses'].append({'width':w,'chapter':name,**data()})
    if w==1280:
     page.locator('.flight-preview-controls').evaluate("e=>e.style.visibility='hidden'");page.screenshot(path=str(OUT/(name+'.png')));page.locator('.flight-preview-controls').evaluate("e=>e.style.visibility=''")
    print('POSE',w,name,flush=True)
  if '--captures' in sys.argv:
   (OUT/'captures.json').write_text(json.dumps(report,indent=2));b.close();print('CAPTURES_EXIT=0',flush=True);sys.exit(0)
  go(2);nested=page.locator('#projects').evaluate('e=>{e.scrollTop=e.scrollHeight;return {top:e.scrollTop,total:e.scrollHeight,height:e.clientHeight}}');assert nested['total']<=nested['height'] or nested['top']>0;report['nestedProjects']=nested
  go(0);page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.idleAngle)>.01")
  page.wait_for_function("!document.querySelector('video').seeking")
  before=data();v=page.locator('video').evaluate('v=>v.currentTime');page.wait_for_timeout(3000);after=data();assert float(after['idleAngle'])>float(before['idleAngle']);assert page.locator('video').evaluate('v=>v.currentTime')==v
  report['checks'].append('Home +Z idle rotates with paused video')
  page.set_viewport_size({'width':1280,'height':800});go(0);page.mouse.move(640,580);page.wait_for_timeout(1000);assert 'model-grab-hover' in (page.locator('html').get_attribute('class') or '');page.mouse.down();page.mouse.move(715,560,steps=10);page.mouse.up();page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.stationUserAngle)>.01");report['checks'].append('Home station raycast drag')
  go(5)
  with tempfile.TemporaryDirectory(prefix='chapter-return-') as temp:
   root=Path(temp).resolve();session=page.context.new_cdp_session(page);frames=[]
   def received(e):
    name=f'{len(frames):05}.jpg';(root/name).write_bytes(base64.b64decode(e['data']));frames.append((name,e['metadata']['timestamp']));session.send('Page.screencastFrameAck',{'sessionId':e['sessionId']})
   session.on('Page.screencastFrame',received);session.send('Page.startScreencast',{'format':'jpeg','quality':75,'maxWidth':960,'maxHeight':600})
   page.evaluate("window.returnPhases=[];window.returnWatch=new MutationObserver(()=>returnPhases.push({phase:document.body.dataset.stationReturn??'idle',time:performance.now(),x:Number(document.querySelector('.flight-preview-controls output').dataset.progress),opacity:getComputedStyle(document.documentElement).getPropertyValue('--return-opacity')}));returnWatch.observe(document.body,{attributes:true,attributeFilter:['data-station-return']})")
   start(True);done();page.wait_for_timeout(1000);session.send('Page.stopScreencast');report['returnPhases']=page.evaluate('returnPhases');page.evaluate('returnWatch.disconnect()')
   report['homeAfterReturn']={'videoTime':page.locator('video').evaluate('v=>v.currentTime'),'posterFallback':page.evaluate("document.body.hasAttribute('data-return-poster')"),'state':data()}
   assert report['homeAfterReturn']['videoTime']<.1 or report['homeAfterReturn']['posterFallback']
   assert data()['station']=='true'
   lines=[]
   for i,(name,t) in enumerate(frames):lines.extend([f"file '{name}'",f'duration {max(.01,frames[i+1][1]-t) if i+1<len(frames) else .1}'])
   (root/'frames.txt').write_text('\n'.join(lines)+'\n')
   ffmpeg=r'C:\Users\SAURABH PRAMANIK\AppData\Local\Temp\vscode-agent-codex-sandbox-me8FPK\video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe'
   subprocess.run([ffmpeg,'-v','error','-y','-f','concat','-safe','0','-i',str(root/'frames.txt'),'-fps_mode','vfr','-c:v','libvpx-vp9','-cpu-used','4','-threads','4','-crf','35','-b:v','0',str(OUT/'return-to-station.webm')],check=True)
   report['recording']={'frames':len(frames),'seconds':frames[-1][1]-frames[0][1],'bytes':(OUT/'return-to-station.webm').stat().st_size}
  report['checks'].append('complete return, hidden reset, Home frame/overlay cleanup')
 for w in [768,375]:
  page.set_viewport_size({'width':w,'height':800});page.wait_for_timeout(2000);assert not page.locator('.chapter-navigation').is_visible();assert page.locator('#hero .hero-action').first.is_visible();report['checks'].append(str(w)+'px original Home/navigation')
 page.set_viewport_size({'width':1280,'height':800});page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(2000);assert not page.locator('.chapter-navigation').is_visible();page.evaluate("window.dispatchEvent(new Event('portfolio:return-station'))");assert not page.evaluate("document.body.hasAttribute('data-station-return')");report['checks'].append('reduced motion bypass')
 page.emulate_media(reduced_motion='no-preference');page.goto('http://localhost:3000/?ship=off',wait_until='domcontentloaded');assert not page.locator('.chapter-navigation').is_visible();assert page.locator('#hero .hero-action').first.is_visible();report['checks'].append('canvas-disabled content/navigation')
 report['errors']=errors;assert not errors,errors
 (OUT/('stress.json' if '--stress' in sys.argv else 'visual.json')).write_text(json.dumps(report,indent=2));b.close();print('CHAPTER_BROWSER_EXIT=0',flush=True)
