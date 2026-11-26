# Interstellar journey ? Session 1

## Environment configuration
`lib/backgroundJourney.ts` owns the six typed regions: hero/sunrise, toolkit/nebula,
projects/asteroid belt, research/ringed gas giant, experience/black hole and contact/galaxy.
Each config includes focal point, transition range, travel distance, parallax, drift,
localized contrast and optional foreground assets. No portfolio content changed.

## Continuous mapping and parallax
The existing journey position publisher supplies visible x and measured section offsets.
Neighbor weights use smoothstep across .08?.98 of each measured span, independent of
active-section edges. Oversized image planes translate with signed distance from their
section, overlap, and feather outside the viewport. Alpha is normalized for source-over
compositing. Reverse travel and halfway stops use the same deterministic mapping.
CSS stars move at .006/.025 of journey x; artwork has region-specific parallax and slow
CSS drift. No baked-in object is treated as a separate layer. Atmospheric motion pauses
when the document is hidden. A localized left scrim uses interpolated region contrast.

## Station anchoring
The existing scene frame computes a reversible departure from .02?.82 of Home?Toolkit.
It translates the station left and deeper while reducing scale, then marks its group
invisible. The existing hit-test guard rejects invisible stations. The model stays mounted;
rotation, drag, quality recovery and DPR protection retain their existing lifecycle.
Home restores the original base position and scale. Ship pose/choreography is unchanged.

## Assets and loading
Owner PNGs are preserved byte-for-byte and normalized through intermediate filenames
for Windows case-only renames. Sharp generates quality-86 WebP without resizing/upscaling;
Home also has a 768px quality-82 mobile derivative (45,058 bytes).

| Original | Native dimensions | PNG bytes | WebP bytes |
|---|---|---:|---:|
| asteroid-belt.png | 1672 ? 941 | 2,252,206 | 183,026 |
| black-hole.png | 1672 ? 941 | 1,974,891 | 115,716 |
| nebula.png | 1672 ? 941 | 2,270,448 | 221,044 |
| planetary-sunrise.png | 1672 ? 941 | 2,265,358 | 205,184 |
| ringed-gas-giant.png | 1672 ? 941 | 2,210,191 | 161,708 |
| spiral-galaxy.png | 1672 ? 941 | 2,146,440 | 152,544 |

All six desktop WebPs total 1,039,222 bytes; PNGs total 13,119,534 bytes.
Initial desktop background requests: Home (205,184 bytes) and adjacent Toolkit
(221,044 bytes), totaling 426,228 bytes, excluding HTML/JS/fonts/models.
Mobile derivative: 45,058 bytes. The 375px production browser run requested both Home
derivatives (250,242 bytes); 768px requested desktop Home (205,184 bytes). Neither
requested the other five desktop regions. Responsive preload duplication remains to tune.
A 1280px canvas-enabled Home run recorded 28 resources and 3,831,008 encoded asset
bytes after 1.5 seconds. Transfer bytes were cache-affected; this is not a cold-load HAR.
Home is preloaded. The loader decodes before publishing CSS image readiness, loads
visible/neighbor regions, and prioritizes a distant HUD target and its neighbors.
Decoded regions are cached for reverse navigation. Failed/pending destinations transfer
weight to the nearest decoded region; a persistent Home plane and procedural base remain
beneath every region. Original PNGs never enter the rendering pipeline.
Only desktop journey mode >=1024px with normal motion/data/power enables regions.
Canvas-disabled desktop retains DOM regions; tablet/mobile/reduced-motion layouts remain.

## Protected systems and Session 2
No new scroll listener, RAF, renderer, light, shader, dependency or postprocessing.
Flight geometry, orbit choreography, ship sampler, interruption, active section detection,
section reveals, cockpit layout, content and station quality fallbacks are preserved.
Session 2 may tune flight choreography separately; this session does not redesign it.
Region framing, overlap distances, station recession and readability require owner visual
review on actual GPU hardware, especially 1920px where the 1672px source is cover-scaled.

## Validation and limits
Lint, typecheck, tests and production build each exited 0; 30 tests passed.
Production-browser DOM checks covered all six destinations at 1024/1280/1440/1920px,
forward/reverse traversal, halfway stops and resizing without document horizontal overflow.
768/375px and reduced-motion disabled region layers. Canvas-disabled desktop retained
all six environments. Canvas-enabled partial traversal and rapid Contact?Research
retargeting with wheel interruption executed. No page errors occurred in sampled normal
runs; Three.js emitted its existing Clock deprecation warning. An intentionally aborted
asteroid request produced its expected network error and retained the decoded nebula.
Actual GPU visual quality, station drag/departure appearance, seam visibility and contrast
have not been exhaustively visually verified; screenshot tooling did not return an image
for inspection. Station departure/restoration are covered by deterministic unit tests.
Remaining Session 2 work: owner visual framing/readability review, GPU station drag and
return checks, responsive preload tuning, then separately authorized flight choreography.
