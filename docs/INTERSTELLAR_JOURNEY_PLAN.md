# Scroll-synchronized cinematic journey

> Current desktop presentation: sequential chapters, a signature concealed station return,
> docked local-axis rotation and a floating professional introduction. See the chapter
> expedition section below. Historical validation remains attributed to its earlier phase.

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
per frame. Home uses the fitted, coordinated docking transform in `lib/homeComposition.ts`. Other resting anchors are
resolved from `lib/shipStaging.ts` into alternating bottom, left and right staging at
world-space depths 7.8-10 units from the camera.
Undock/bank, depth climb, broad sweep, descending flyby and rising-glide controls extend
through camera-depth controls up to 24 units. Resting scale is 1.37 (1.3015 in the dense 1024px composition), blended per leg: depth comes from
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
its desktop phase is now sampled from the same visible progress. Content copy and HUD layout
are unchanged; the staging reservations below adjust desktop section bounds.

## Development diagnostics
`/dev/flight` renders the same horizontal homepage plus controls only in development; it
returns notFound in production. Its slider inspects measured progress and its buttons reuse
existing navigation ownership. Mutable diagnostics are displayed at 5Hz, not every frame:
progress, target/decoded timestamps, seek lag/latency, seek/coalescing counts, XYZ, camera
distance, phase, destination, station visibility and a scene-frame FPS estimate. Staging adds
base quaternion, normalized resting anchor, idle angle/weight, projected hull-length estimate,
profile, draw calls and triangles; controls inspect axial angles and compare lighting.

## Dynamic destination staging and idle animation
The current staging task supersedes the previous upper-right parking arrangement. Typed
`DESTINATION_STAGES` uses the repository section IDs and centralizes normalized anchors,
camera depth, per-destination size, nose direction, bank, entry/departure controls, idle
periods and content-safe rectangles. World poses resolve through the existing FOV48 camera.
This configuration is authoritative for ship staging; the protected cinematic timeline retains
its video moments unchanged, and its historical pose fields are no longer sampled.
Home now uses the shared fitted ship/station composition, with no floating idle; see the current refinement below.

| Destination | Resting composition | Entry profile |
|---|---|---|
| Toolkit | Bottom center; horizontal, nose right; three-quarter hull | Undock, recede and bank |
| Projects | Left; vertical, nose up | Diagonal depth climb |
| Research | Right; vertical/diagonal, visible depth | Receding broad sweep |
| Experience | Bottom center; horizontal, nose left | Descending depth flyby |
| Contact | Left; near-vertical diagonal | Calm rising glide |

Non-Home model scale is now 1.37, versus .98 in commit 3d3bfa2 (39.8% increase).
The dense aspect-ratio variant is 1.3015, versus .931. Projected bounds include perspective,
orientation and local axial rotation rather than assuming that pixel sizes scale linearly.
Depth still changes in world space; there is no global scene scaling or camera zoom.
Desktop CSS reserves the lower viewport for Toolkit/Experience and opposite-side content
space for Projects/Research/Contact. Existing nested scroll regions retain all content;
these layout rules require the active canvas, desktop journey and normal motion. Contact
uses an 80% local dark panel to protect muted text against the final bright star.

The asset audit decoded EXT_meshopt_compression POSITION data: Z is the longitudinal axis,
with a narrow +Z end (end-slice XY extents .2065/.2184) and wider -Z end (.4912/.2919).
This agrees with forwardSign=1, the runtime +Z nose bound, and both engine nozzles at Z=-.78.
No asset geometry, textures, materials, exposure or tone mapping were modified.

The existing FlightShip callback remains the sole transform owner. `lib/shipArrival.ts`
samples measured visible x: movement above .35 cumulative pixels resets a .28s settling
window. Arrival regions are 8% of viewport width, capped at 10% of the adjacent measured
panel interval. Neither scroll position nor journey/video progress is changed. Settled,
eligible arrivals blend from the deterministic sampled pose to the resting pose over .85s.
A pending manual interruption handoff resolves over the existing .8s before idle starts.
A genuine midpoint stop holds its deterministic travel pose. Small scroll adjustments leave
idle from the displayed transform and recover after settling; no canonical quaternion reset.

Levitation is .045-.05 world units at 5.6-6.6s periods; local +Z rotation remains 32-40s.
The 1.2s arrival envelope and .25s suspension cap remain, with bounded offsets layered on a
fresh base pose. Reduced-motion/tablet/canvas-disabled paths do not enter this desktop branch.

Desktop lighting now also includes Home: existing key moves to [3,5,12], intensity3.2,
warm-white color; ambient .50 and directional rim1.4. The existing point fades out. These
blend smoothly to the prior destination values during the first .3 section coordinate:
key[6,8,12]/2.8, ambient .64, rim2.4. Original lighting remains outside desktop journey
mode. No extra light, shadow map, postprocessing pass, renderer or animation loop was added.
Materials, textures, exposure, tone mapping and both GLB assets remain unchanged.

### Prior staging phase validation (commit 3d3bfa2)
- Final lint, typecheck, 33 tests and production build each exited 0.
- The native desktop matrix completed all 24 destination checks at 1024/1280/1440/1920px.
  Its initial run then timed out compiling the root route for fallbacks. A competing Portfolio
  dev server was stopped; the targeted checks rerun exited 0. Both facts are retained in
  `validation.json` rather than labeling the initial full invocation a success.
- Verified rendered angles: .0436, 1.6144, 3.1852, 4.7560, 6.3268 radians for requested
  0/quarter/half/three-quarter/full turns. Close-ups were inspected: hull detail and main
  upward direction remain readable through the revolution. Zero-angle inspection required
  a real range value change; the harness now uses trusted keyboard input and rendered-state
  waits, not fixed delays or synthetic unchanged-value events.
- Video held exactly at 7.596387s during settled idle. Mid-flight XYZ drift was zero over
  the hold check, with idle weight 0. Arbitrary-angle departure began at 2.14363 radians.
- HUD retarget/wheel interruption, Home redocking, station absence, canvas off, 768/375px
  and reduced motion passed. Nested Projects scrolled 482px through 1080px content in a
  598px viewport; Contact links received focus without interception.
- CDP recorded 27 observed frames spanning 8.5734s into a 174,968-byte WebM. Original frame
  timestamps determine playback holds; it is a software capture, not a smoothness demo.

| Development software comparison | Staged lighting | Original lighting |
|---|---:|---:|
| Median rAF interval | 850.0ms | 816.7ms |
| p95 rAF interval | 966.7ms | 833.3ms |
| Scene FPS estimate | 1.08 | 1.14 |

These short 2.5s samples are sparse and dominated by software rendering: approximately
4% median difference does not certify a physical GPU regression budget. Renderer counters
shown in diagnostics are the last composer pass (one fullscreen draw), not total scene draw
calls. No geometry, renderer, shadow map, extra postprocessing or animation loop was added.
Idle delta is capped at .25s to avoid suspension jumps, so severe software stalls also slow
its nominal periods. Physical GPU frame pacing, full-journey visual banking and station
interaction/DPR recovery remain owner hardware checks. Existing video seek latency is
unchanged and remains a separate known limitation.

Evidence: [all destination and rotation captures](./validation/staging/),
[browser checks](./validation/staging/validation.json),
[transition/hold checks](./validation/staging/transition-validation.json),
[transition recording](./validation/staging/transitions.webm).
[Production smoke](./validation/staging/production-smoke.json) exited 0: homepage HTTP200,
/dev/flight HTTP404, active canvas, WebGL error 0, no page/console errors, and Toolkit video
held exactly at 3.398583s during ship idle. Confirmed renderer: ANGLE Vulkan SwiftShader.
The four observed production rAF intervals had median 866.6ms and p95 933.3ms. This is
severely limited software rendering, not evidence of hardware smoothness. The development
lighting toggle samples also include live idle motion and potential shader warm-up, so the
4% difference is observational rather than an isolated GPU lighting benchmark. Resting hull
captures, full-angle close-ups and the final Contact contrast adjustment were inspected.
No push, merge or deployment was performed.

## Chapter expedition

The existing section order and IDs remain hero, toolkit, projects, research, experience,
contact. `content/expedition.ts` pairs clear professional labels/descriptions with configurable
cinematic chapter names. `ChapterNavigation` replaces only the visible desktop tabs: Begin
Journey, Next Chapter, a discreet previous link, current chapter and native progress indicator.
The original mobile/tablet/reduced-motion/canvas-disabled navigation remains. A direct
`?ship=off#toolkit` link offers the portfolio without the cinematic animation. Anchors still
use the existing controller/history, measured section targets and shared active-section provider.
No section IDs, ordinary spline controls, chronological video mapping, seek queue or assets change.

Return is an explicit idle/departing/hyperspace/preparing/approach state machine sampled by
the existing FlightShip `useFrame`; it is still the sole ship transform owner. Departure
captures the displayed automatic and user quaternion, consumes the nested user rotation and
recedes through a banked XYZ spline. A pointer-transparent CSS/SVG veil and 44 radial lines
obscure the reset without a new renderer or global animation loop. The ship remains under
the veil; no extra light, bloom, shadow or engine material modification is introduced.
The existing engine-power signal damps toward .95 during departure/transit and .55 on approach.

Timing targets: departure700ms, hyperspace650ms, preparation250ms minimum/2200ms maximum,
clockwise two-leg approach1800ms: nominal3.4s, bounded5.35s excluding stalled frames. The
fully opaque preparation phase invokes the existing controller's explicit instant navigation;
the existing horizontal track owner applies its measured target directly. Intermediate panels
and video are never visibly played backward. The unchanged media scheduler seeks Home as a
consequence of that position. Preparation checks the Home position and paused video frame;
on timeout, Home's frame-zero poster covers stale footage until the decoder catches up or
the user leaves Home. The approach follows upper-left, upper-right and lower-right XYZ
controls into the existing enlarged docking anchor, with quaternion endpoints preserved.

Repeated return requests are ignored. Skip/Escape and resize return directly to Home;
wheel/scrollbar/scroll-key interruption captures the displayed transform into the existing
manual handoff. Other navigation and history retarget through the same controller. Context
loss removes effects and invokes the existing readable static fallback. Cleanup removes
temporary phase attributes, custom properties and controls; no scrolling lock is installed.
The phase store is separate from Three.js so mobile navigation does not import the 3D helpers.

Home now uses a44s local +Z axial period with zero levitation/translation. The prior source
audit established the actual +Z nose/-Z engine convention; both GLBs remain unchanged.
Ordinary departure inherits the current displayed roll. The signature arrival reaches the
canonical Home quaternion before the bounded idle envelope resumes. The paused background
does not follow this ambient rotation. Existing station drag, fitted full-yaw envelope,
lighting and Home-only station lifecycle remain intact.

The introduction is floating, content-configured text at left4vw/top140px with a bounded
30vw/380px line width, responsive26-42px name and15px description. It uses localized text
shadows, no panel/scrim/blur. Only its Begin Journey link accepts pointer events. It presents
Saurabh as a Full-Stack & AI Developer without altering mobile positioning copy. Toolkit
regroups only existing technologies into full-stack, AI, and systems/tools categories.
Projects retain source order/details/architecture and expose repository/demo/case-study links
outside collapsed details on desktop. Codady is not present in source content and was not
invented. Research emphasizes the existing objective and findings/limitations; its classical
baseline result stays unchanged. Experience keeps actual roles, dates, education and the
existing date-confirmation note. Body copy uses16px/1.65 line-height within the existing
destination-safe layouts; nested scrolling preserves access to denser content.

The introduction is mounted beside the fixed navigation, outside the translated content
track. The initial inside-track prototype inherited a132px offset and failed its bounds
check; no model shrinking was used to fix it. Its bottom is capped above the viewport's
horizontal midpoint, with compact scrollable typography on short desktop heights. Station
drag fitting keeps geometry below the ship's lower world-space bound; the fixed introduction
uses the upper-left region and accepts pointers only on its visible action (or its short-height
scroll area). Desktop content padding is28px, headings30-42px, and research's objective/venue
stack vertically so findings are readable sooner. The original tab header becomes a small
transparent brand at the left HUD margin; chapter controls stay above the models/content.

Implementation inventory:
- Presentation/data: `content/expedition.ts`, `components/chapter-navigation.tsx`, `components/site-nav.tsx`, `app/globals.css`.
- Content hierarchy: toolkit/projects/research/experience/contact section components (desktop variants only).
- Navigation/scene: `components/horizontal-journey.tsx`, `components/section-reveal-controller.tsx`, `components/space/SpaceBackgroundCanvas.tsx`, `components/space/SpaceBackground.tsx`.
- Helpers: `lib/chapterNavigation.ts`, `lib/stationReturn.ts`, `lib/stationReturnStatus.ts`, `lib/shipStaging.ts`.
- Tests/tooling: `lib/chapterJourney.test.mts`, existing cinematic tests, npm test command, `scripts/validate-chapters.py`, `scripts/validate-chapters-production.py`.
- Delivery: this plan, `PROGRESS.md`, and captured validation evidence.

### Chapter validation

Final focused and regression suite:42 tests passed (six new chapter/return tests), with zero
skips. These cover chapter order/neighbor boundaries, supported technology provenance, desktop
capability/reduced-motion gate, phase timing/readiness/timeout, cancellation and phase-edge
cleanup, displayed-quaternion departure continuity, two-leg XYZ continuity and44s Home roll
with invariant docking position/nose. The existing video scheduler and flight tests still pass.

Edge controller/layout validation exited0 at1024/1280/1440/1920px. Raster draws were suppressed
only for that controller run; real geometry/layout measurements, event handling and DOM state
were retained. It passed repeated return/Skip, wheel interruption, retargeting, resize, changing
reduced motion during a return, media failure timeout, context-loss fallback, keyboard/Previous
Chapter, history back/forward, rapid ordinary retarget, forward/reverse off-anchor idle, deep
links,375/768px, reduced motion and canvas-disabled content. Intro/header/content bounds passed
all four desktop widths. See [controller results](./validation/chapters/stress.json) and
[layout results](./validation/chapters/layout.json).

The full-render native run completed all24 destination checks, Home rotation with unchanged
paused video time, raycast station dragging and a complete return capture. That invocation
exited1 at its final development fallback-route navigation timeout; it is not an overall pass.
A fresh final six-destination capture run exited0 after the desktop readability adjustments.
Its screenshots were inspected for intro/model separation, clean Home, destination staging,
readable engineering content and navigation placement. See [capture results](./validation/chapters/captures.json),
[Home](./validation/chapters/home.png), [Toolkit](./validation/chapters/toolkit.png),
[Projects](./validation/chapters/projects.png), [Research](./validation/chapters/research.png),
[Experience](./validation/chapters/experience.png) and [Contact](./validation/chapters/contact.png).
Earlier harness attempts also exposed an initial geometry-readiness race after reload and
the need to isolate further navigation from a deliberately lost renderer. The final checks
wait for published geometry and verify static fallback after loss before reloading that case.

Final release gates: lint exit0, typecheck exit0, test exit0 (42 passed), production build exit0.
Development preview was stopped before building. Reported homepage first-load JavaScript is
253kB versus the prior252kB (rounded build values); shared JS remains103kB. No dependency,
renderer, light, shadow pass or global animation loop was added. SVG stars mount only during
the return and are removed afterward; phase subscriptions update React only at phase edges.

The built-site smoke exited0 with zero page/console errors. All five real Begin/Next links,
the real Return to Station button, Home focus restoration, star/control cleanup, nested
Projects scrolling,375/768px, normal-URL reduced motion and canvas-disabled content passed.
The explicit no-flight reading link was clicked and verified as a real display-mode navigation;
it deliberately bypasses the flight interceptor, while normal chapter anchors retain it.
Home video time was0 before/after a four-second stationary hold. See
[production results](./validation/chapters/production.json),
[production Home return](./validation/chapters/production-home-return.png), and
[complete production return recording](./validation/chapters/production-return.webm).

The native recording is120,722 bytes,34 observed frames over35.11s including click preparation
and an arrival hold; independent full FFmpeg decode exited0. Phase-edge timestamps measure
the actual active transition at5.692s: departure817ms, hyperspace828ms, preparation845ms,
approach3202ms. This is slower than the nominal3.4s under severely limited software rendering;
the movie preserves observed timestamps rather than speeding them up. Contact-sheet and
final-frame inspection confirm the concealed reset, radial transit, XYZ approach and restored
enlarged docking composition with the floating introduction.

The short production Home sample contains three positive frame intervals: median1783.2ms,
p951866.6ms on SwiftShader/software decode. It is not comparable to earlier different-scene
samples, and cannot establish a hardware performance regression or physical-GPU smoothness.
Full-speed visual tuning and hardware frame pacing remain owner review items. The existing
bounded idle delta makes ambient roll slower under this software load. Short desktop heights
use a compact scrollable introduction rather than shrinking the models; dense content keeps
native nested scrolling. Existing video seek latency and the prior wide/short Home size cap
remain unchanged. No push, merge or deployment was performed.


Changed implementation files: `lib/shipStaging.ts` (typed staging/idle helpers),
`lib/cinematicFlight.ts` (profile geometry/approaches),
`components/space/SpaceBackgroundCanvas.tsx` (existing transform and lighting owners),
`app/globals.css` (desktop reservations/Contact contrast), `lib/cinematicDiagnostics.ts`
and `app/dev/flight/FlightPreview.tsx` (development inspection),
`lib/cinematicJourney.test.mts` (focused coverage), and `scripts/validate-staging.py`
(optional Edge captures, checks and timestamped transition recording). Documentation is
in this plan and `PROGRESS.md`; evidence lives under `docs/validation/staging/`.


## Previous phase measurements and validation
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
That phase left the model dark against some nebula regions; the current staging task adds
the restrained lighting described above.
Old loop files remain unused historical assets. No push, merge or deployment was performed.

Evidence: [machine-readable browser results](./validation/cinematic-validation.json),
[Home](./validation/cinematic-home.png), [depth travel](./validation/cinematic-depth.png),
[Contact](./validation/cinematic-contact.png). Captures are native 1280x800; the final
composition was inspected for docking, station absence, ship visibility and text overlap.

## Prior refinement: idle recovery and cinematic Home (4c4ffc1)

Root cause: the previous stable-stop gate required alignment within 1.1 horizontal pixels.
Ordinary manual arrivals remained in travel state; the same gate also prevented pending
manual handoffs from resolving and therefore blocked idle. Audit confirmed the canvas uses
its normal continuous R3F frameloop; no demand-mode invalidation or missing RAF was involved.
The fix changes eligibility and settling in the existing transform owner, not rendering ownership.

`HOME_COMPOSITION` centralizes the 1.8 starting enlargement, 1.2 ship emphasis, FOV48/depth8.35,
96px top reserve, 68px bottom reserve and .16-unit clearance. Home has a -.18rad station pitch,
90-degree initial station yaw and a fixed 45-degree ship axial angle (nose remains upward). A bounded fit scales the ship
and station together, centers the combined projected silhouette and recalibrates ship height
above the station. Runtime ship bounds and station geometry measurements replace estimates.
The compact station profile comes directly from source vertices: 32 height bins, both bin
ends and 32 circumscribed ring points, at most 2048 points regardless of mesh complexity.
It conservatively covers continuous ambient yaw. The first prototype expanded every convex
hull vertex across yaw samples; that expensive temporary representation was discarded.
The profile is computed only for desktop canvas widths. Source bounds and parent/centering
transforms are handled explicitly so crossing the tablet breakpoint does not change normalization.
Layout fitting is cached by viewport/assets, not recomputed for each section or ambient turn.

User station drag remains on the existing nested quaternion/inertia owner. Its separately
cached fit reduces only the station when needed to preserve viewport/docking clearance;
it never moves the ship's Home anchor or rebuilds a flight due to drag. Departure still
uses the original .02-.82 Home-to-Toolkit station mapping, with no station unmount.
Initial load, resize, manual/HUD/history return and reverse travel share the same Home pose.
Existing spline controls, banks, depth excursions and interpolation remain unchanged.

Only active desktop canvas + horizontal journey suppresses the Home introduction, proof
points, action links, local star overlay and floating roll hit target via display:none.
No invisible controls remain tabbable. A visually hidden content-sourced heading preserves
Home identity. All original content stays in the DOM/source and returns for canvas failure,
canvas off, mobile/tablet and reduced motion. No replacement marketing content was added.

Changed implementation: `lib/shipArrival.ts`, `lib/homeComposition.ts`, `lib/modelHull.ts`,
`lib/shipStaging.ts`, `components/space/SpaceBackgroundCanvas.tsx`, the ship/station bounds
callbacks, `components/hero.tsx`, `app/globals.css`, development diagnostics/preview, and
focused cinematic tests. Optional `scripts/validate-refinement.py` captures native Edge
checks and timestamped screencasts; `scripts/validate-refinement-production.py` checks the
production server and `scripts/measure-refinement.mts` reproduces source-bound comparisons.
These tools add no runtime dependency.

### Measured refinement sizes

Measurements use identical runtime source AABBs and the real FOV48 perspective projection.
The before pose is reconstructed from commit 3d3bfa2. Station values use nominal ambient
yaw zero in each configuration; these are conservative projected bounds, not traced pixel
silhouettes. The fitted full-yaw source-geometry envelope is separately recorded by diagnostics.
All rows below use an 800px viewport height. Source geometry/materials remain unchanged.

| Viewport width | Home ship before -> after (px) | Station width before -> after (px) | Ship bounding area ratio |
|---|---|---|---|
| 1024 | 67x267 -> 122x408 | 431 -> 726 | 2.79x |
| 1280 | 67x267 -> 112x374 | 587 -> 878 | 2.36x |
| 1440 | 67x267 -> 107x356 | 701 -> 968 | 2.14x |
| 1920 | 67x267 -> 94x310 | 1142 -> 1218 | 1.64x |

The initial 1.5-1.8x targets are bounded rather than forced: a 1920x800 viewport already had
a very wide station. Its width grows only 6.7% to preserve full rotation/viewport and HUD
clearance; the wider ship presentation still increases its projected bounding area 64%.
At 1280x800, station width increases 49.5% and ship height 40.2%, with a 67% width increase.
Axial presentation changes projected area; no global scene or camera scaling is involved.

At 1280x800, the canonical non-Home longest projected dimensions are Toolkit205->287px,
Projects186->260px, Research180->252px, Experience231->323px and Contact194->271px.
These approximately 40% increases include perspective and actual source bounds, before idle
rotation. `scripts/measure-refinement.mts` reproduces the comparison in `sizes.json`.

### Refinement validation

Native Edge used SwiftShader and software video decoding. The desktop matrix exercised
all six stops at 1024/1280/1440/1920px with off-anchor manual arrivals. All 24 pose checks
completed; that invocation exited 1 in its post-resize tail. A final four-width Home run
exited 0. The separate behavior/fallback tail exited 0 with no page errors: reverse arrival,
small adjustment, axial idle while video time stays fixed, deterministic midpoint hold,
HUD retarget/wheel interruption, Home return and desktop content suppression, 375/768px,
reduced motion and meaningful canvas-disabled content. Earlier tail harness failures came
from fixed-delay settling and rounded CSS matrices; the final version observes the existing
full-precision journey progress without changing application scroll behavior.

The recording run exited 0, including actual raycast station dragging (0.699rad user angle),
release/reset, manual idle and Home departure/return. Its 100 observed frames span 125.74s;
the WebM is 849,867 bytes and a complete independent FFmpeg decode exited 0. One generic
HTTP500 resource message occurred during this development capture; its URL was not retained.
The separate production smoke explicitly checks console and page errors.

The built-in development FPS simulation exited 0: real canvas backing DPR reduced from
1.25 to 1 and restored to 1.25, with one station mount and zero unmounts. Raster draws were
suppressed only in this isolated controller test; full-render captures/recording are separate.
It establishes reversible controller/lifecycle behavior, not physical GPU performance.

Evidence: [desktop matrix](./validation/refinement/matrix-validation.json),
[final Home matrix](./validation/refinement/home-validation.json),
[behavior/fallback results](./validation/refinement/validation.json),
[DPR simulation](./validation/refinement/dpr-simulation.json),
[size measurements](./validation/refinement/sizes.json),
[recording results](./validation/refinement/recording.json),
[idle and Home recording](./validation/refinement/idle-and-home.webm).
Inspected captures: [Home](./validation/refinement/hero.png),
[Toolkit](./validation/refinement/toolkit.png), [Projects](./validation/refinement/projects.png),
[Research](./validation/refinement/research.png), [Experience](./validation/refinement/experience.png),
[Contact](./validation/refinement/contact.png), [station drag](./validation/refinement/station-drag.png).

Final release gates: `npm run lint` exit 0, `npm run typecheck` exit 0,
`npm run test` exit 0 (36 passed, zero skipped), `npm run build` exit 0.
The preview was stopped before building; the production smoke ran on the completed build.
Production browser exit 0: HTTP200, development route HTTP404, zero page/console errors,
WebGL error0, keyboard navigation, history back/forward and nested Projects scrolling passed.
The inspected ship crops show actual hull rotation while video time stays exactly 7.597285s.
Normal-URL reduced motion and an injected unavailable WebGL context retain meaningful Home
content; reduced motion loads no video source. See [production results](./validation/refinement/production-smoke.json),
[idle before](./validation/refinement/production-idle-before.png) and
[idle after](./validation/refinement/production-idle-after.png).

Performance limits: the short production Toolkit sample has median 774.95ms/p95 833.3ms
frame intervals on SwiftShader. The development Home recording's three valid intervals
have median 1516.7ms/p95 1566.6ms; its initial negative timestamp sample is explicitly excluded.
These are different scenes/build modes, not a before/after performance comparison. Severe
software rendering and the existing bounded frame delta slow visible ambient motion here.
Physical GPU frame pacing, native VP9 seek performance and subjective full-speed flight still
need owner review. No additional renderer, animation loop, scroll listener, light, shadow pass,
postprocessing effect or runtime dependency was added. Layout fitting is cached and diagnostics
projection is development-only. Existing video seek latency remains outside this refinement.
The 1920x800 Home enlargement cap is intentional. Background video bytes, timing/seek queue,
original GLBs/materials, content sources and destination spline profiles are unchanged.
No push, merge or deployment was performed.
