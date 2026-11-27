"""Optional local validation: pip install playwright; run against `npm run dev`.

Uses installed Edge with software WebGL, not the editor's resizing preview surface.
No browser download or application dependency is required.
"""
import json
import re
import statistics
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3002"
PRODUCTION = "--production" in sys.argv[2:]
OUT = Path(__file__).resolve().parent.parent / "docs" / "validation"
OUT.mkdir(parents=True, exist_ok=True)
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
report = {"renderer": "headless Edge / SwiftShader", "matrix": []}

with sync_playwright() as driver:
    browser = driver.chromium.launch(executable_path=EDGE, headless=True, args=[
        "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader",
        "--disable-accelerated-video-decode",
        "--disable-background-networking", "--disable-sync",
    ])
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    page.set_default_timeout(30000)
    errors = []
    console_errors = []
    expect_errors = False
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text)
            if message.type == "error" and not expect_errors else None)

    def open_scene(path=None):
        if path is None:
            path = "/?ship=on" if PRODUCTION else "/dev/flight?ship=on"
        page.goto(BASE + path, wait_until="domcontentloaded")
        page.wait_for_function("!!document.querySelector('video')")

    def snapshot():
        return page.evaluate("""() => {
          const v=document.querySelector('video');
          const j=document.querySelector('[data-horizontal-journey]');
          let target=0;
          if(j && Number.isFinite(v.duration)) {
            const coordinate=Math.max(0,Math.min(5,-new DOMMatrixReadOnly(
              document.querySelector('.horizontal-journey__track').style.transform).m41/
              Number(j.dataset.horizontalDistance)*5));
            const i=Math.min(4,Math.floor(coordinate)),moments=[0,.17,.38,.60,.81,1];
            target=(moments[i]+(moments[i+1]-moments[i])*(coordinate-i))*(v.duration-1/120);
          }
          return {width:innerWidth,time:v.currentTime,paused:v.paused,autoplay:v.autoplay,
            loop:v.loop,state:document.querySelector('.space-background').dataset.videoState,
            source:v.currentSrc,readyState:v.readyState,seeking:v.seeking,
            mediaError:v.error?{code:v.error.code,message:v.error.message}:null,
            targetTime:target,decodedTime:window.__cinema?.decoded??null,identity:v.dataset.identity,
            diagnostics:document.querySelector('.flight-preview-controls output')?.innerText,
            overflow:document.documentElement.scrollWidth>innerWidth};
        }""")

    def move(fraction):
        page.wait_for_selector("[data-horizontal-journey='active']")
        # Resizing returns before the existing ResizeObserver has measured the track.
        # Wait for fonts and stable measured distances before deriving native scrollY.
        page.evaluate("async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}")
        previous = None
        stable = 0
        for _ in range(30):
            geometry = page.evaluate("()=>({...document.querySelector('[data-horizontal-journey]').dataset})")
            stable = stable + 1 if geometry == previous else 0
            if stable >= 3:
                break
            previous = geometry
            page.wait_for_timeout(100)
        print(f"Move width={page.viewport_size['width']} fraction={fraction}", flush=True)
        page.evaluate("""f=>{const d=document.querySelector('[data-horizontal-journey]').dataset;
          window.scrollTo({top:f===0?0:Number(d.scrollStart)+Number(d.verticalDistance)*f,
            behavior:'instant'});} """, fraction)
        page.wait_for_function("""f=>Math.abs(new DOMMatrixReadOnly(
          document.querySelector('.horizontal-journey__track').style.transform).m41+
          Number(document.querySelector('[data-horizontal-journey]').dataset.horizontalDistance)*f)<1""", arg=fraction)
        page.wait_for_timeout(450)
        moments = [0, .17, .38, .60, .81, 1]
        coordinate = fraction * 5
        index = min(4, int(coordinate))
        expected = (moments[index] + (moments[index+1]-moments[index])*(coordinate-index))*(20-1/120)
        page.wait_for_function("""time=>!document.querySelector('video').seeking &&
          Math.abs(document.querySelector('video').currentTime-time)<.06 &&
          document.querySelector('.space-background').dataset.videoState==='ready'""", arg=expected)

    def capture(name):
        panel = page.locator(".flight-preview-controls")
        if panel.count():
            panel.evaluate("el=>el.style.visibility='hidden'")
        page.screenshot(path=str(OUT / (name + ".png")))
        if panel.count():
            panel.evaluate("el=>el.style.visibility=''")

    def wait_destination(end):
        page.wait_for_function("""end=>{const v=document.querySelector('video'),
          j=document.querySelector('[data-horizontal-journey]'),
          x=-new DOMMatrixReadOnly(document.querySelector('.horizontal-journey__track').style.transform).m41;
          return Math.abs(x-Number(j.dataset.horizontalDistance)*end)<1 && !v.seeking &&
            Math.abs(v.currentTime-(end?(v.duration-1/120):0))<.04;
        }""", arg=end)

    def fly(section):
        if PRODUCTION:
            selector = '.site-brand' if section == 'hero' else f'.site-nav a[href="/#{section}"]'
            page.locator(selector).first.click()
        else:
            page.get_by_role("button", name="Fly to " + section, exact=True).click()

    open_scene()
    page.wait_for_function("document.querySelector('video').readyState>=2")
    assert not page.evaluate("document.hidden"), "Headless foreground must be genuinely visible"
    page.evaluate("""()=>{
      window.__cinema={seeks:[],start:0,plays:0,metadata:1,active:0,maxActive:0,decoded:0};
      const v=document.querySelector('video');
      v.dataset.identity='persistent';
      v.addEventListener('seeking',()=>{const t=window.__cinema;t.start=performance.now();
        t.active++;t.maxActive=Math.max(t.maxActive,t.active);});
      v.addEventListener('seeked',()=>{const t=window.__cinema;t.seeks.push(performance.now()-t.start);t.active=0;});
      v.addEventListener('play',()=>window.__cinema.plays++);
      v.addEventListener('loadedmetadata',()=>window.__cinema.metadata++);
      if(v.requestVideoFrameCallback) {
        const next=()=>v.requestVideoFrameCallback((now,m)=>{window.__cinema.decoded=m.mediaTime;next();});
        next();
      }
    }""")
    initial = snapshot()
    assert initial["paused"] and not initial["autoplay"] and not initial["loop"]

    for width in [1024, 1280, 1440, 1920]:
        page.set_viewport_size({"width": width, "height": 800})
        for fraction in [.5, 1, .25]:
            move(fraction)
            sample = snapshot()
            assert sample["width"] == width and sample["paused"] and not sample["overflow"]
            assert sample["state"] == "ready", sample
            report["matrix"].append(sample)

    page.set_viewport_size({"width": 1280, "height": 800})
    move(0)
    capture("cinematic-home")
    before = snapshot()
    page.wait_for_timeout(1000)
    after = snapshot()
    assert before["time"] == after["time"], "Stationary video advanced"
    report["stationary"] = {"before": before, "after": after}
    move(.3)
    capture("cinematic-depth")

    # Existing navigation owner: distant transit, retarget, wheel cancellation, return.
    fly("contact")
    page.wait_for_timeout(250)
    fly("research")
    page.wait_for_timeout(250)
    page.mouse.wheel(0, -450)
    page.wait_for_timeout(700)
    report["interrupted"] = snapshot()
    fly("hero")
    wait_destination(0)
    report["redocked"] = snapshot()
    if not PRODUCTION:
        assert "station visible" in report["redocked"]["diagnostics"]
        assert "hero / idle" in report["redocked"]["diagnostics"]
    fly("contact")
    wait_destination(1)
    report["contact"] = snapshot()
    assert report["contact"]["time"] > 19.96
    if not PRODUCTION:
        assert "station departed" in report["contact"]["diagnostics"]
        assert "contact / idle" in report["contact"]["diagnostics"]
    capture("cinematic-contact")
    if PRODUCTION:
        page.go_back(wait_until="domcontentloaded")
        wait_destination(0)
        report["historyBack"] = snapshot()
        assert report["historyBack"]["time"] < .04
        page.go_forward(wait_until="domcontentloaded")
        wait_destination(1)
        report["historyForward"] = snapshot()
        assert report["historyForward"]["time"] > 19.96
    assert page.locator('video').get_attribute('data-identity') == 'persistent'
    metrics = page.evaluate("window.__cinema")
    assert metrics["plays"] == 0 and metrics["metadata"] == 1
    ordered = sorted(metrics["seeks"])
    report["seeking"] = {"count": len(ordered), "medianMs": statistics.median(ordered),
        "p95Ms": ordered[int(len(ordered)*.95)], "maximumMs": max(ordered),
        "playEvents": metrics["plays"], "metadataLoads": metrics["metadata"],
        "maximumInFlightEvents": metrics["maxActive"]}

    for width in [768, 375]:
        page.set_viewport_size({"width": width, "height": 800})
        open_scene("/?ship=off")
        page.wait_for_timeout(500)
        sample = page.evaluate("""()=>({width:innerWidth,src:document.querySelector('video').getAttribute('src'),
          overflow:document.documentElement.scrollWidth>innerWidth})""")
        assert sample["src"] is None and not sample["overflow"]
        report[str(width)] = sample
    page.set_viewport_size({"width": 1280, "height": 800})
    page.emulate_media(reduced_motion="reduce")
    open_scene("/?ship=off")
    page.wait_for_timeout(400)
    assert page.locator("video").get_attribute("src") is None
    report["reducedMotion"] = "static; no media source"
    page.emulate_media(reduced_motion="no-preference")
    open_scene("/?ship=off")
    page.wait_for_function("document.querySelector('video').readyState>=2")
    move(.5)
    assert page.locator("canvas").count() == 0 and page.locator("video").evaluate("v=>v.paused")
    report["canvasDisabled"] = snapshot()

    # Slow initial loading retains poster, then catches up without playback.
    page.route("**/space-background-scrub.mp4", lambda route: (page.wait_for_timeout(700), route.continue_()))
    open_scene("/?ship=off")
    page.wait_for_function("document.querySelector('video').readyState>=2")
    report["slowLoading"] = snapshot()
    page.unroute("**/space-background-scrub.mp4")
    # Both media formats unavailable: semantic content and static background remain.
    expect_errors = True
    page.route("**/space-background-scrub.*", lambda route: route.abort())
    open_scene("/?ship=off")
    page.wait_for_timeout(700)
    report["mediaFailure"] = snapshot()
    assert report["mediaFailure"]["state"] == "poster"
    page.unroute("**/space-background-scrub.*")
    open_scene("/?ship=off")
    page.wait_for_function("document.querySelector('video').readyState>=2")
    page.evaluate("""()=>{const v=document.querySelector('video');
      const descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
      Object.defineProperty(v,'currentTime',{get:()=>descriptor.get.call(v),set:()=>{throw new Error('Injected seek failure')}});
    }""")
    page.evaluate("""()=>{const d=document.querySelector('[data-horizontal-journey]').dataset;
      window.scrollTo({top:Number(d.scrollStart)+Number(d.verticalDistance)*.4,behavior:'instant'});} """)
    page.wait_for_timeout(800)
    report["seekFailure"] = snapshot()
    assert report["seekFailure"]["state"] in ["held", "poster"]
    report["pageErrors"] = errors
    report["consoleErrors"] = console_errors
    assert not errors, errors
    assert not console_errors, console_errors
    (OUT / "cinematic-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"status": "passed", "widths": [1024,1280,1440,1920], "seeking": report["seeking"]}))
    browser.close()
