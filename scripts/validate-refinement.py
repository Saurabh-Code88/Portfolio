"""Native Edge software validation; optional tooling, no application dependency."""
import json, sys, time, base64, tempfile, subprocess, statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent.parent/'docs/validation/refinement'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",headless=True,args=['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-accelerated-video-decode'])
 page=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1.25 if '--dpr' in sys.argv else 1); page.set_default_timeout(120000)
 if '--dpr' in sys.argv:
  page.add_init_script("""(()=>{for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){const c=window[name];if(!c)continue;for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])if(c.prototype[method])c.prototype[method]=function(){}}})()""")
 page.on('pageerror',lambda e:print('ERROR',str(e),flush=True))
 page.on('response',lambda r:print('HTTP_ERROR',r.status,r.url,flush=True) if r.status>=400 else None)
 quality_events=[];lifecycle=[]
 page.on('console',lambda m:lifecycle.append(m.text) if m.text in ['[station] mounted','[station] unmounted'] else None)
 page.on('console',lambda m:quality_events.append(m.text) if '[station] quality' in m.text else None)
 page.on('console',lambda m:print(m.text,flush=True) if 'bounds' in m.text or m.type=='error' else None)
 page.goto('http://localhost:3000/dev/flight?ship=on'+('&stationFpsTest=1' if '--record' in sys.argv else ''),wait_until='domcontentloaded')
 page.wait_for_function("Number(document.querySelector('.flight-preview-controls output')?.dataset.fps)>0")
 page.wait_for_function("document.querySelector('.flight-preview-controls output')?.dataset.stationLoaded==='true'")
 page.wait_for_timeout(4000)
 out='.flight-preview-controls output'
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 report={'renderer':'Edge SwiftShader; software video decode','poses':[],'checks':{}}
 def state(): return page.locator(out).evaluate('(el)=>({...el.dataset})')
 def scroll(i,offset=0):
  page.wait_for_selector("[data-horizontal-journey='active']")
  page.evaluate("""async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}""")
  page.wait_for_function("""()=>{const j=document.querySelector('[data-horizontal-journey]'),v=j.querySelector('.horizontal-journey__viewport'),t=j.querySelector('.horizontal-journey__track');return Math.abs(Number(j.dataset.horizontalDistance)-(t.scrollWidth-v.clientWidth))<1}""")
  page.evaluate("""([i,offset])=>{const j=document.querySelector('[data-horizontal-journey]'),d=j.dataset,p=document.querySelectorAll('[data-journey-panel]')[i];
   window.dispatchEvent(new WheelEvent('wheel',{deltaY:0}));
   window.scrollTo({top:Number(d.scrollStart)+Number(d.verticalDistance)*(p.offsetLeft+offset)/Number(d.horizontalDistance),behavior:'instant'});
  }""",[i,offset])
  page.wait_for_function("""i=>{const d=document.querySelector('.flight-preview-controls output').dataset;return d.destination===['hero','toolkit','projects','research','experience','contact'][i]&&d.moving==='false'&&Number(d.arrival)===1&&(i===0||Number(d.idleWeight)>.99)}""",arg=i)
  return state()
 def capture(name):
  page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility='hidden'")
  page.screenshot(path=str(OUT/(name+'.png')))
  page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility=''")
 if '--dpr' in sys.argv:
  # Warm the same browser's shaders before starting the existing eight-second simulation.
  quality_events.clear();lifecycle.clear()
  page.goto('http://localhost:3000/dev/flight?ship=on&stationFpsTest=1',wait_until='domcontentloaded')
  page.wait_for_function("document.querySelector('.flight-preview-controls output')?.dataset.stationLoaded==='true'")
  page.wait_for_timeout(4000)
  samples=[]
  for i in range(35):
   samples.append(page.locator('canvas').evaluate('c=>({ratio:c.width/c.clientWidth,time:performance.now()})'))
   page.wait_for_timeout(500)
  assert any(abs(s['ratio']-1)<.01 for s in samples),samples
  assert any(abs(s['ratio']-1.25)<.01 for s in samples),samples
  assert any('quality reduced' in e for e in quality_events),quality_events
  assert any('quality restored' in e for e in quality_events),quality_events
  assert lifecycle.count('[station] mounted')==1 and '[station] unmounted' not in lifecycle,lifecycle
  (OUT/'dpr-simulation.json').write_text(json.dumps({'mode':'isolated built-in development FPS threshold simulation at device DPR1.25; raster draws suppressed; real canvas backing ratios and lifecycle','qualityEvents':quality_events,'lifecycle':lifecycle,'samples':samples},indent=2))
  b.close();print('DPR_SIMULATION_EXIT=0',flush=True);sys.exit(0)
 if '--record' in sys.argv:
  report['qualityEvents']=quality_events
  scroll(0);capture('home-recording')
  page.mouse.move(640,580);page.wait_for_timeout(500)
  report['dragCursor']=page.locator('html').get_attribute('class')
  page.mouse.down();page.mouse.move(725,560,steps=12);page.wait_for_timeout(1000);page.mouse.up()
  page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.stationUserAngle)>.01")
  report['dragState']=state();capture('station-drag')
  page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.stationUserAngle)<.002")
  page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility='hidden'")
  with tempfile.TemporaryDirectory(prefix='portfolio-refinement-') as temp:
   root=Path(temp).resolve();assert root.is_relative_to(Path(tempfile.gettempdir()).resolve())
   session=page.context.new_cdp_session(page);frames=[]
   def received(event):
    name=f'{len(frames):05}.jpg';(root/name).write_bytes(base64.b64decode(event['data']))
    frames.append((name,event['metadata']['timestamp']))
    session.send('Page.screencastFrameAck',{'sessionId':event['sessionId']})
   session.on('Page.screencastFrame',received)
   session.send('Page.startScreencast',{'format':'jpeg','quality':75,'maxWidth':960,'maxHeight':600,'everyNthFrame':1})
   scroll(1,32)
   before=state();page.wait_for_timeout(7000);after=state()
   report['recordedIdle']={'before':before,'after':after}
   assert float(after['idleAngle'])>float(before['idleAngle'])
   page.evaluate("window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:'hero'}}))")
   page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.progress)<.0001")
   page.wait_for_timeout(4000)
   home=state();report['recordedReturn']=home
   page.evaluate("window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:'contact'}}))")
   page.wait_for_timeout(4000)
   page.evaluate("window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:'hero'}}))")
   page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.progress)<.0001")
   page.wait_for_timeout(2000)
   session.send('Page.stopScreencast')
   lines=[]
   for i,(name,timestamp) in enumerate(frames):
    lines.extend([f"file '{name}'",f"duration {max(.01,frames[i+1][1]-timestamp) if i+1<len(frames) else .1}"])
   (root/'frames.txt').write_text('\n'.join(lines)+'\n')
   subprocess.run([sys.argv[-1],'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(root/'frames.txt'),'-fps_mode','vfr','-c:v','libvpx-vp9','-cpu-used','4','-threads','4','-crf','35','-b:v','0',str(OUT/'idle-and-home.webm')],check=True)
   report['recording']={'frames':len(frames),'seconds':frames[-1][1]-frames[0][1],'bytes':(OUT/'idle-and-home.webm').stat().st_size}
  # Independent short software observation, with compilation/checks complete.
  samples=page.evaluate("""()=>new Promise(resolve=>{const samples=[];let last=null;const end=performance.now()+4000;const tick=now=>{if(last!==null)samples.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else resolve(samples)};requestAnimationFrame(tick)})""")
  report['performance']={'samples':samples,'medianMs':statistics.median(samples),'p95Ms':sorted(samples)[int(len(samples)*.95)],'fps':state()['fps']}
  (OUT/'recording.json').write_text(json.dumps(report,indent=2))
  b.close();print('RECORDING_EXIT=0',flush=True);sys.exit(0)
 for w in ([] if '--checks-only' in sys.argv else [1024,1280,1440,1920]):
  page.set_viewport_size({'width':w,'height':800})
  for i,name in enumerate(['hero'] if '--home-only' in sys.argv else ['hero','toolkit','projects','research','experience','contact']):
   # Purposefully arrive off-anchor: verifies actual manual-scroll idle recovery.
   d=scroll(i,0 if i==0 or i==5 else 28)
   report['poses'].append({'viewportWidth':w,'destination':name,**d})
   (OUT/('home.partial.json' if '--home-only' in sys.argv else 'validation.partial.json')).write_text(json.dumps(report,indent=2))
   print('POSE',w,name,d['scale'],d['idleWeight'],flush=True)
   if w==1280: capture(name)
 if '--home-only' in sys.argv:
  (OUT/'home-validation.json').write_text(json.dumps(report,indent=2));b.close();print('HOME_VALIDATION_EXIT=0',flush=True);sys.exit(0)
 # Reverse arrival, tiny adjustment, midpoint hold and frozen video.
 page.set_viewport_size({'width':1280,'height':800})
 print('Checking reverse / idle hold',flush=True)
 scroll(3,-35); scroll(2,30)
 page.wait_for_function('!document.querySelector("video").seeking')
 before=state(); video=page.locator('video').evaluate('v=>v.currentTime')
 page.wait_for_timeout(5000); after=state()
 assert float(after['idleAngle'])>float(before['idleAngle'])
 assert page.locator('video').evaluate('v=>v.currentTime')==video
 report['checks']['idleHold']={'before':before,'after':after,'video':video}
 scroll(2,34); report['checks']['smallAdjustment']=state()
 page.evaluate("""()=>{const j=document.querySelector('[data-horizontal-journey]'),d=j.dataset;window.dispatchEvent(new WheelEvent('wheel',{deltaY:0}));window.scrollTo({top:Number(d.scrollStart)+Number(d.verticalDistance)*.5,behavior:'instant'})}""")
 # Read the published full-precision timeline. CSS matrices round large translations.
 page.wait_for_function("""()=>{const d=document.querySelector('[data-horizontal-journey]').dataset,target=Math.max(0,Math.min(1,(scrollY-Number(d.scrollStart))/Number(d.verticalDistance))),p=Number(document.querySelector('.flight-preview-controls output').dataset.progress);return Math.abs(p-target)<1e-9}""")
 print('Midpoint timeline settled',flush=True)
 page.evaluate("()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
 a=state();page.wait_for_timeout(2000);z=state()
 assert float(z['idleWeight'])==0 and z['eligible']=='false'
 assert max(abs(float(a[k])-float(z[k])) for k in ['x','y','z'])<.0001
 report['checks']['midpoint']={'before':a,'after':z}
 # Existing HUD event, retarget and interruption; no bespoke navigation.
 page.get_by_role('button',name='Fly to contact',exact=True).click()
 page.wait_for_timeout(500)
 page.get_by_role('button',name='Fly to research',exact=True).click()
 page.wait_for_timeout(700)
 page.mouse.wheel(0,-80)
 page.wait_for_timeout(2000)
 scroll(3,-25);report['checks']['interruptedIdle']=state()
 print('Checking Home return / drag / fallbacks',flush=True)
 scroll(0); report['checks']['returnHome']=state()
 assert page.locator('#hero .hero-panel__content').evaluate("el=>getComputedStyle(el).display==='none'")
 assert not page.locator('#hero .hero-action').first.is_visible()
 report['checks']['suppressedHome']=True
 # Actual raycast-driven station drag; capture before/after and pointer grab state.
 capture('home-before-drag')
 page.mouse.move(640,565);page.wait_for_timeout(500)
 cursor=page.locator('html').get_attribute('class')
 page.mouse.down();page.mouse.move(720,540,steps=12);page.wait_for_timeout(1000);page.mouse.up()
 capture('home-after-drag');report['checks']['stationDragCursor']=cursor
 # Browser errors and meaningful fallback content.
 for w in [768,375]:
  page.set_viewport_size({'width':w,'height':800});page.wait_for_timeout(2000)
  assert page.locator('#hero .hero-action').first.is_visible()
  assert page.locator('video').evaluate('v=>!v.getAttribute("src")')
  report['checks'][str(w)]='Home content visible; video source absent'
 page.set_viewport_size({'width':1280,'height':800});page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(2000)
 assert page.locator('#hero .hero-action').first.is_visible()
 assert page.locator('video').evaluate('v=>!v.getAttribute("src")')
 report['checks']['reducedMotion']='Home content visible; video source absent'
 page.emulate_media(reduced_motion='no-preference')
 page.goto('http://localhost:3000/?ship=off',wait_until='domcontentloaded');page.wait_for_timeout(2000)
 assert page.locator('#hero .hero-action').first.is_visible()
 report['checks']['canvasDisabled']='meaningful Home content and links visible'
 report['errors']=errors;assert not errors
 (OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
 print('BROWSER_VALIDATION_EXIT=0',flush=True)
