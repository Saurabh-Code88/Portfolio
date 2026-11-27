"""Built-site chapter/return smoke and native recording. No app dependency."""
import json,base64,tempfile,subprocess,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent.parent/'docs/validation/chapters'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(120000)
 errors=[];console=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 page.goto('http://localhost:3001/?ship=on',wait_until='domcontentloaded');page.wait_for_selector('.chapter-navigation',state='visible')
 page.wait_for_function("document.querySelector('video')?.readyState>=2")
 page.wait_for_function("performance.getEntriesByType('resource').some(e=>e.name.includes('/models/station.glb')&&e.responseEnd>0)")
 page.evaluate("async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}");page.wait_for_timeout(8000)
 def settled(i):
  page.wait_for_function("i=>{const j=document.querySelector('[data-horizontal-journey]'),p=j.querySelectorAll('[data-journey-panel]')[i],t=j.querySelector('.horizontal-journey__track');return Math.abs(-new DOMMatrixReadOnly(getComputedStyle(t).transform).m41-p.offsetLeft)<1}",arg=i)
 for i in range(1,6):
  page.locator('.chapter-navigation .chapter-button').click();settled(i);print('PRODUCTION_CHAPTER',i+1,flush=True)
  if i==2:
   nested=page.locator('#projects').evaluate('e=>{e.scrollTop=e.scrollHeight;return {top:e.scrollTop,total:e.scrollHeight,height:e.clientHeight}}');assert nested['total']<=nested['height'] or nested['top']>0
 with tempfile.TemporaryDirectory(prefix='production-return-') as temp:
  root=Path(temp).resolve();session=page.context.new_cdp_session(page);frames=[]
  def received(e):
   name=f'{len(frames):05}.jpg';(root/name).write_bytes(base64.b64decode(e['data']));frames.append((name,e['metadata']['timestamp']));session.send('Page.screencastFrameAck',{'sessionId':e['sessionId']})
  session.on('Page.screencastFrame',received);session.send('Page.startScreencast',{'format':'jpeg','quality':75,'maxWidth':960,'maxHeight':600})
  page.evaluate("window.returnPhases=[];window.returnWatch=new MutationObserver(()=>returnPhases.push({phase:document.body.dataset.stationReturn??'idle',time:performance.now(),opacity:getComputedStyle(document.documentElement).getPropertyValue('--return-opacity')}));returnWatch.observe(document.body,{attributes:true,attributeFilter:['data-station-return']})")
  page.get_by_role('button',name='Return to Station',exact=False).click()
  page.wait_for_function("document.body.hasAttribute('data-station-return')")
  page.wait_for_function("!document.body.hasAttribute('data-station-return')");settled(0)
  assert not page.locator('.station-return__controls').count()
  assert page.locator('.station-return').evaluate("e=>getComputedStyle(e).visibility==='hidden'")
  assert page.locator('.chapter-introduction').is_visible()
  page.wait_for_function("document.activeElement?.id==='chapter-introduction-heading'")
  assert page.locator('.station-return svg').count()==0
  page.wait_for_timeout(1000);session.send('Page.stopScreencast');phases=page.evaluate('returnPhases');page.evaluate('returnWatch.disconnect()')
  lines=[]
  for i,(name,t) in enumerate(frames):lines.extend([f"file '{name}'",f'duration {max(.01,frames[i+1][1]-t) if i+1<len(frames) else .1}'])
  (root/'frames.txt').write_text('\n'.join(lines)+'\n')
  ffmpeg=r'C:\Users\SAURABH PRAMANIK\AppData\Local\Temp\vscode-agent-codex-sandbox-me8FPK\video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe'
  subprocess.run([ffmpeg,'-v','error','-y','-f','concat','-safe','0','-i',str(root/'frames.txt'),'-fps_mode','vfr','-c:v','libvpx-vp9','-cpu-used','4','-threads','4','-crf','35','-b:v','0',str(OUT/'production-return.webm')],check=True)
  recording={'frames':len(frames),'seconds':frames[-1][1]-frames[0][1],'bytes':(OUT/'production-return.webm').stat().st_size}
 page.screenshot(path=str(OUT/'production-home-return.png'))
 page.wait_for_function("!document.querySelector('video').seeking")
 v=page.locator('video').evaluate('v=>v.currentTime');assert v<.1 or page.evaluate("document.body.hasAttribute('data-return-poster')")
 page.wait_for_timeout(4000);assert page.locator('video').evaluate('v=>v.currentTime')==v
 samples=page.evaluate("()=>new Promise(resolve=>{let last=null;const a=[],end=performance.now()+4000;function tick(n){if(last!==null)a.push(n-last);last=n;if(n<end)requestAnimationFrame(tick);else resolve(a)}requestAnimationFrame(tick)})")
 for w in [768,375]:
  page.set_viewport_size({'width':w,'height':800});page.wait_for_timeout(2000);assert not page.locator('.chapter-navigation').is_visible();assert page.locator('#hero .hero-action').first.is_visible()
 page.set_viewport_size({'width':1280,'height':800});page.wait_for_selector('.chapter-direct',state='visible')
 with page.expect_navigation(wait_until='domcontentloaded'):page.locator('.chapter-direct').click()
 page.wait_for_function("!document.body.classList.contains('space-canvas-active')");assert page.locator('#hero .hero-action').first.is_visible()
 reduced=b.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce');reduced.goto('http://localhost:3001/',wait_until='domcontentloaded');assert reduced.locator('#hero .hero-action').first.is_visible();assert not reduced.locator('.chapter-navigation').is_visible();reduced.close()
 fallback=b.new_page(viewport={'width':1280,'height':800});fallback.goto('http://localhost:3001/?ship=off',wait_until='domcontentloaded');assert fallback.locator('#hero .hero-action').first.is_visible();assert not fallback.locator('.chapter-navigation').is_visible();fallback.close()
 assert not errors and not console,(errors,console)
 report={'status':'passed','chapters':'all five real Next/Begin link clicks','return':'real Return to Station button; Home focus and overlay cleanup','nestedProjects':nested,'returnPhases':phases,'recording':recording,'homeVideoTime':v,'pausedHold':True,'samplesMs':samples,'medianMs':statistics.median(samples),'p95Ms':sorted(samples)[int(len(samples)*.95)],'renderer':'Edge SwiftShader; software decode; no physical GPU claim','mobileTabletReducedCanvasDisabled':'passed','pageErrors':errors,'consoleErrors':console}
 (OUT/'production.json').write_text(json.dumps(report,indent=2));b.close();print('CHAPTER_PRODUCTION_EXIT=0',flush=True)
