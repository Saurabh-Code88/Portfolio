"""Optional Python Playwright validation against the development preview (installed Edge).
Run: python scripts/validate-staging.py http://localhost:3002
Software rendering only; no application dependency or browser download.
"""
import json
import base64
import subprocess
import tempfile
import statistics
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv)>1 else "http://localhost:3002"
OUT = Path(__file__).resolve().parent.parent / "docs" / "validation" / "staging"
OUT.mkdir(parents=True,exist_ok=True)
IDS = ["hero","toolkit","projects","research","experience","contact"]
report = {"renderer":"headless Edge / SwiftShader / software video decode","poses":[]}
CHECKS_ONLY='--checks-only' in sys.argv
if CHECKS_ONLY:
    report['matrixEvidence']='Matrix skipped by --checks-only; run without that flag for the complete 24-pose matrix.'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",headless=True,args=["--use-angle=swiftshader-webgl","--enable-unsafe-swiftshader","--disable-accelerated-video-decode"])
    page=browser.new_page(viewport={"width":1280,"height":800})
    page.set_default_timeout(60000)
    errors=[]
    page.on("pageerror",lambda e:(errors.append(str(e)),print("Page error: "+str(e),flush=True)))
    page.goto(BASE+"/dev/flight?ship=on",wait_until="domcontentloaded")
    output=".flight-preview-controls output"
    page.wait_for_selector(output)
    page.wait_for_selector("[data-horizontal-journey='active']")
    page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.fps)>0")
    def state():
        return page.locator(output).evaluate("el=>({...el.dataset})")
    def stop(i):
        page.wait_for_selector("[data-horizontal-journey='active']")
        page.evaluate("""async i=>{await document.fonts.ready;
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const j=document.querySelector('[data-horizontal-journey]'),d=j.dataset;
          const panel=document.querySelectorAll('[data-journey-panel]')[i];
          window.dispatchEvent(new WheelEvent('wheel',{deltaY:0}));
          window.scrollTo({top:i===0?0:Number(d.scrollStart)+Number(d.verticalDistance)*panel.offsetLeft/Number(d.horizontalDistance),behavior:'instant'});
        }""",i)
        page.wait_for_function("""i=>{const el=document.querySelector('.flight-preview-controls output');
          return Math.abs(Number(el.dataset.progress)-i/5)<.0002 &&
            (i===0 || Number(el.dataset.idleWeight)>.99);}""",arg=i)
        return state()
    def angle_input(angle):
        control=page.get_by_label('Inspect axial angle')
        control.evaluate('(el,step)=>el.step=String(step)',angle if angle else .01)
        # Initial default is already zero; force a trusted value change before requesting zero.
        control.press('End')
        control.press('Home')
        if angle: control.press('ArrowRight')
    def capture(name):
        page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility='hidden'")
        clip={"x":95,"y":250,"width":230,"height":320} if name.startswith('projects-roll-') else None
        page.screenshot(path=str(OUT/(name+".png")),clip=clip)
        page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility=''")
    if '--record-only' in sys.argv:
        # CDP screencast keeps native frame timestamps; FFmpeg only packages the observed frames.
        stop(5)
        capture('contact')
        page.locator('#contact .contact-links a').last.focus()
        assert page.evaluate("document.activeElement.closest('#contact')!==null")
        stop(2)
        nested=page.locator('#projects').evaluate("""el=>{el.scrollTop=el.scrollHeight;
          return {top:el.scrollTop,height:el.clientHeight,content:el.scrollHeight};}""")
        assert nested['content']<=nested['height'] or nested['top']>0,nested
        page.locator('#projects').evaluate('el=>el.scrollTop=0')
        page.evaluate("""()=>{const d=document.querySelector('[data-horizontal-journey]').dataset;
          window.scrollTo({top:Number(d.scrollStart)+Number(d.verticalDistance)*.5,behavior:'instant'});}""")
        page.wait_for_function("""()=>{const d=document.querySelector('.flight-preview-controls output').dataset;
          return Math.abs(Number(d.progress)-.5)<.0001 && Number(d.idleWeight)===0;}""")
        page.wait_for_timeout(5000)
        held_pose=state();page.wait_for_timeout(1000);after_pose=state()
        assert all(abs(float(held_pose[k])-float(after_pose[k]))<1e-6 for k in ['x','y','z'])
        stop(2)
        angle_input(2.1)
        page.wait_for_function("Number(document.querySelector('.flight-preview-controls output').dataset.idleAngle)>2")
        departure_pose=state()
        page.get_by_role('button',name='Resume idle rotation',exact=True).click()
        page.locator('.flight-preview-controls').evaluate("el=>el.style.visibility='hidden'")
        session=page.context.new_cdp_session(page)
        frames=[]
        with tempfile.TemporaryDirectory(prefix='portfolio-staging-') as folder:
            root=Path(folder).resolve()
            assert root.is_relative_to(Path(tempfile.gettempdir()).resolve())
            def received(event):
                name=f'{len(frames):05}.jpg'
                (root/name).write_bytes(base64.b64decode(event['data']))
                frames.append((name,event['metadata']['timestamp']))
                session.send('Page.screencastFrameAck',{'sessionId':event['sessionId']})
            session.on('Page.screencastFrame',received)
            session.send('Page.startScreencast',{'format':'jpeg','quality':75,'maxWidth':960,'maxHeight':600,'everyNthFrame':1})
            page.wait_for_timeout(300)
            for destination in ['contact','experience','hero']:
                page.evaluate("id=>window.dispatchEvent(new CustomEvent('portfolio:flight-to',{detail:{sectionId:id}}))",destination)
                page.wait_for_timeout(2200)
            session.send('Page.stopScreencast')
            assert not errors,errors
            assert len(frames)>2,frames
            lines=[]
            for i,(name,timestamp) in enumerate(frames):
                lines.append(f"file '{name}'")
                lines.append(f"duration {max(.01,frames[i+1][1]-timestamp) if i+1<len(frames) else .1}")
            (root/'frames.txt').write_text('\n'.join(lines)+'\n')
            subprocess.run([sys.argv[-1],'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(root/'frames.txt'),'-vf','fps=12','-c:v','libvpx-vp9','-crf','35','-b:v','0',str(OUT/'transitions.webm')],check=True)
            recording={'recordedFrames':len(frames),'seconds':frames[-1][1]-frames[0][1],'bytes':(OUT/'transitions.webm').stat().st_size,'midFlightHold':[held_pose,after_pose],'arbitraryIdleDeparture':departure_pose,'nestedProjectScroll':nested,'contactFocus':'passed'}
            (OUT/'transition-validation.json').write_text(json.dumps(recording,indent=2)+'\n')
            print(json.dumps({'recordedFrames':recording['recordedFrames'],'seconds':recording['seconds'],'bytes':recording['bytes']}))
        browser.close()
        sys.exit(0)
    for width in ([] if CHECKS_ONLY else [1024,1280,1440,1920]):
        page.set_viewport_size({"width":width,"height":800})
        page.wait_for_timeout(600)
        for i,section in enumerate(IDS):
            print(f"Stage {width} {section}",flush=True)
            sample=stop(i)
            sample.update({"width":width,"section":section})
            assert sample['station']==str(i==0).lower(),sample
            assert float(sample['idleWeight'])==0 if i==0 else float(sample['idleWeight'])>.99
            bounds=page.locator('#'+section).bounding_box()
            assert bounds and bounds['x']>=-1 and bounds['x']+bounds['width']<=width+1,bounds
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            report['poses'].append(sample)
            if width==1280:capture(section)
    page.set_viewport_size({"width":1280,"height":800});page.wait_for_timeout(600);stop(2)
    # Complete physical local-axis revolution while checking a stationary video and lighting.
    video_before=page.locator('video').evaluate('v=>v.currentTime')
    idle_before=state()
    page.wait_for_timeout(2500)
    idle_after=state()
    assert float(idle_after['idleAngle'])>float(idle_before['idleAngle'])
    assert page.locator('video').evaluate('v=>v.paused && !v.autoplay && !v.loop')
    video_after=page.locator('video').evaluate('v=>v.currentTime')
    # Allow an outstanding scroll seek to finish before the stationary comparison.
    page.wait_for_function("!document.querySelector('video').seeking")
    held=page.locator('video').evaluate('v=>v.currentTime');page.wait_for_timeout(1000)
    assert held==page.locator('video').evaluate('v=>v.currentTime')
    report['idleHold']={"before":idle_before,"after":idle_after,"videoBefore":video_before,"videoAfter":video_after,"settledHeld":held}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    for angle in [0,1.5708,3.1416,4.7124,6.28318]:
        print(f'Checking rendered angle {angle}',flush=True)
        angle_input(angle)
        page.wait_for_function("angle=>Math.abs(Number(document.querySelector('.flight-preview-controls output').dataset.idleAngle)-angle)<.1",arg=angle)
        report.setdefault('rotation',[]).append(state())
        assert abs(float(state()['idleAngle'])-angle)<.1,state()
        capture('projects-roll-'+str(round(angle,2)))
    page.get_by_role('button',name='Resume idle rotation',exact=True).click()
    # Same destination/renderer; short samples include live idle motion and shader warm-up.
    def frames():
        samples=page.evaluate("""()=>new Promise(resolve=>{const samples=[];let last=performance.now();const end=last+2500;
          const tick=now=>{samples.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else resolve(samples);};requestAnimationFrame(tick);})""")
        return {"medianFrameMs":statistics.median(samples),"p95FrameMs":sorted(samples)[int(len(samples)*.95)],"scene":state()}
    report['lightingOn']=frames()
    page.get_by_role('button',name='Toggle ship lighting',exact=True).click();page.wait_for_timeout(300)
    report['lightingOff']=frames()
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    page.get_by_role('button',name='Toggle ship lighting',exact=True).click()
    # Depart from arbitrary idle angle, skip destinations, retarget and interrupt.
    page.get_by_role('button',name='Fly to contact',exact=True).click();page.wait_for_timeout(200)
    page.get_by_role('button',name='Fly to research',exact=True).click();page.wait_for_timeout(250)
    page.mouse.wheel(0,350);page.wait_for_timeout(800)
    report['interrupted']=state()
    stop(0);report['redocked']=state();assert report['redocked']['station']=='true'
    for width in [768,375]:
        page.set_viewport_size({"width":width,"height":800});page.goto(BASE+'/?ship=off',wait_until='domcontentloaded');page.wait_for_timeout(600)
        assert page.locator('video').get_attribute('src') is None
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.set_viewport_size({"width":1280,"height":800});page.emulate_media(reduced_motion='reduce')
    page.goto(BASE+'/?ship=off',wait_until='domcontentloaded');page.wait_for_timeout(500)
    assert page.locator('video').get_attribute('src') is None
    page.emulate_media(reduced_motion='no-preference');page.goto(BASE+'/?ship=off',wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('video').readyState>=2")
    assert page.locator('canvas').count()==0
    report['pageErrors']=errors;assert not errors,errors
    report['status']='passed'
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({"status":"passed","poses":len(report['poses']),"lightingOn":report['lightingOn'],"lightingOff":report['lightingOff']}))
    browser.close()
