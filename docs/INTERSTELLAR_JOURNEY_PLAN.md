# Scroll-synchronized cinematic journey

## Authority and architecture audit
The owner superseded autonomous looping video and circular desktop arrivals.
The native horizontal journey in `components/horizontal-journey.tsx` remains authoritative:
its existing scroll listener, layout measurements, smoothing RAF and `journeyRevealPosition`
publisher supply visible x, viewport width and actual section offsets. No new scroll listener
or master RAF was added. Existing HUD navigation owns its existing scroll RAF, history,
keyboard cancellation, wheel interruption and rapid retargeting. Desktop orbit/settle timers
are zero; the existing scene frame samples the visible journey rather than elapsed flight time.

Previously independent time owners were video autoplay/loop; HUD travel/orbit/settle clocks;
manual scroll-orbit sampling; hero bob/spin; section arrival timers; and camera following.
For desktop, video/ship/station departure/reveals/telemetry now consume measured visible x.
The camera is fixed at its original perspective position (0,0,8), FOV48, near .1/far120.
Ambient station rotation, nested drag/inertia/reset, engine effects and the explicit user
roll button retain their existing local interaction clocks; they do not advance the journey.
Legacy tablet/fallback flight/camera paths remain outside the desktop branch.

## Chronological footage and keyframes
Source: `public/backgrounds/space-background.mp4`, preserved byte-for-byte. Verified H.264,
1920x1080, 30 FPS, 20 seconds, no audio, 9,808,313 bytes. `scripts/prepare-space-video.py`
now encodes chronological derivatives directly from that original, with no trim, crossfade,
reversal, resizing or temporal effects. Old loop derivatives are historical files, never loaded.
Poster/mobile still are regenerated from frame zero, not the old two-second loop start.

| Asset | Bytes | Strategy |
|---|---:|---|
| Original MP4 | 9,808,313 | Preserved source |
| Scrubbing MP4 | 14,528,611 | H.264 CRF22 medium; GOP15; no B frames; scene cuts disabled; faststart |
| Scrubbing WebM | 6,519,749 | VP9 CRF32; GOP15; no alt-ref/lookahead; four encoding threads |
| Desktop poster | 63,516 | 1920x1080 WebP, source frame zero |
| Mobile still | 19,172 | 768x432 WebP, source frame zero |

The MP4 deliberately costs more bytes than the original to bound random-access decode work.
FFmpeg verifies both derivatives at 20.00 seconds, 1080p/30 FPS, 600 frames and
half-second keyframes (40 total per derivative).
MP4 is the baseline; WebM is used only after MP4 media failure when VP9 is advertised.
The integrated browser advertises no VP9 decoder; its WebM responsiveness cannot be claimed.
Temporary FFmpeg tooling is outside the repo and adds no application runtime dependency.

## Continuous video mapping and scheduler
`lib/cinematicTimeline.ts` defines configurable video fractions at the six section anchors:
Home 0, Toolkit .17, Projects .38, Research .60, Experience .81, Contact 1. Actual measured
panel intervals interpolate these moments continuously, independently of active-section changes.
The mapping uses metadata duration and ends 1/120s before duration, inside the final 30 FPS
frame rather than on a fragile exact frame boundary. Reverse travel evaluates the same mapping.
The HTML video remains mounted, muted, inline and paused, with no autoplay or loop attribute.
Section navigation never changes src or calls play. Its restrained 1.2% parallax is preserved.

`lib/videoScrub.ts` permits exactly one seek in flight plus one overwritten latest target.
It waits for metadata/current-frame readiness and actual seekable ranges, clamps to a ready
range, and coalesces rapid targets instead of queuing intermediate seeks. seeked drains the
latest target. requestVideoFrameCallback reports decoded mediaTime; seeked/loadeddata provide
an explicitly labeled compatibility fallback. No decoder callback moves the master timeline.
A 5s watchdog holds the previous decoded frame during a stalled seek while preserving the
single pending seek. Its eventual seeked event resumes the latest target; there are no
overlapping retries. Setter/media errors terminate seeking. Native scrolling never waits.
A seek failure holds the last decoded frame when possible; initial/media failure retains the
poster. Hidden documents defer seeking, then catch up to the latest visible progress on return.
Mobile/tablet/reduced-motion/data/power modes never attach a video source.

## Real 3D flight and interruption
`lib/cinematicFlight.ts` constructs reusable cubic Bezier geometry on layout changes, not
per frame. Home uses the measured original docking transform. Other resting anchors are
projected into the safe right margin at world-space depths 7.8-10 units from the camera.
Climb, depth dive, broad sweep, deep flyby and diagonal-glide control points extend through
actual Z depths up to 26 camera units. Scale stays .78 beyond undocking: depth comes from
perspective and world-space translation, not scale-only simulation or animated camera zoom.

The model's +Z nose follows sampled path tangents; ordered quaternion keys avoid Euler and
hemisphere flips, with restrained banking derived from signed curvature plus per-leg tuning.
Quintic parameterization gives zero positional velocity at the resting anchors. Ordered
quaternion samples slerp into natural three-quarter poses and preserve reverse continuity.
Distant HUD jumps build one transit spline from the current transform to the destination;
they do not replay each intermediate arrival. Retargeting rebuilds from the visible transform.
Wheel/keyboard interruption preserves that transform and blends back to the manual sampler
across existing measured progress distance, holding still when progress itself stops.

## Station, content and telemetry
Home-only station departure stays on the original .02-.82 Home-to-Toolkit mapping. It remains
mounted, becomes non-visible/non-hit-testable before Toolkit, and restores base placement and
scale on return. Station drag and reversible DPR degradation/recovery remain unchanged.
`SectionRevealController` remains the only reveal controller. Its existing arrival-distance
mapping now begins revealing during the approach, preserving completed/focused content,
visit floors, nested scrolling and layouts. Cockpit telemetry still consumes the existing store;
its desktop phase is now sampled from the same visible progress. No content or HUD layout changed.

## Development diagnostics
`/dev/flight` renders the same horizontal homepage plus controls only in development; it
returns notFound in production. Its slider inspects measured progress and its buttons reuse
existing navigation ownership. Mutable diagnostics are displayed at 5Hz, not every frame:
progress, target/decoded timestamps, seek lag/latency, seek/coalescing counts, XYZ, camera
distance, phase, destination, station visibility and a scene-frame FPS estimate.

## Measurements and validation
A local integrated-browser H.264 pass recorded 99 seeks: median 23.3ms, mean 36.4ms,
p95 101.6ms, max 350.1ms, and zero play events. Decoded-frame lag occasionally exceeded
half a second during coarse jumps/host stalls before catching up. Observed scene estimates
were approximately 25-30 FPS in that pass; this is not a hardware smoothness claim.
The integrated host reports document.hidden even when brought forward; visibility was
explicitly simulated for its foreground tests. Software/headless captures are separate evidence.

The controlled production run uses fixed viewport sizes in headless Edge, software video
decoding and SwiftShader. Unlike the editor pane, it produces native 1280x800 screenshots.
Resting destinations and intermediate controls use the upper-right open band to keep the
ship above project cards and Contact copy; XYZ depth controls and Home docking stay intact.

Final production validation (`scripts/validate-cinematic.py --production`) exited 0:

| Check | Result |
|---|---|
| Lint / typecheck / test / production build | Exit 0 each; 30 tests passed |
| Desktop matrix | 1024, 1280, 1440, 1920px; forward, reverse, final frame and resize |
| Manual/HUD ownership | Distant transit, retarget, wheel interruption, redock, back/forward passed |
| Persistent video | 1 metadata load, 0 play events, maximum 1 in-flight seek |
| Stationary hold | 0.004892s before and after a one-second hold |
| Seeking | 116 seeks; median 837.9ms, p95 2225.4ms, maximum 2950.7ms |
| Settled decoded lag | 14.5-30.0ms at sampled matrix stops; not a peak moving-lag measurement |
| Failure/accessibility | Slow loading, aborted media, throwing seek setter, canvas off, 768/375px and reduced motion passed |
| Production diagnostics | `/dev/flight` HTTP 404 |
| Browser errors | No page errors or unexpected console errors |

Initial harness runs exposed a resize-measurement race and a fixed-delay history assertion.
The final harness waits for stable measured geometry and actual track/decoded endpoints;
it preserves the same one-pixel track and frame-time assertions rather than weakening them.

These software results show visible seek latency under load; they do not establish smooth
continuous scrubbing on a physical GPU. The earlier integrated-browser timing is a separate
environment, not interchangeable with this result. Hardware frame pacing, native VP9 seek
performance, station drag/DPR recovery and subjective full-journey banking need owner review.
The model remains relatively dark against some nebula regions; no new lighting was added.
Old loop files remain unused historical assets. No push, merge or deployment was performed.

Evidence: [machine-readable browser results](./validation/cinematic-validation.json),
[Home](./validation/cinematic-home.png), [depth travel](./validation/cinematic-depth.png),
[Contact](./validation/cinematic-contact.png). Captures are native 1280x800; the final
composition was inspected for docking, station absence, ship visibility and text overlap.
