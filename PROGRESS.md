# Progress
Branch: feature/cinematic-space-redesign
Done: Typed destination staging now owns non-Home anchors, depth, orientation, scale, idle parameters, safe regions and path controls.
Poses: Toolkit bottom/right-facing; Projects left/up; Research right/diagonal; Experience bottom/left-facing; Contact left/up-diagonal.
Home: Original measured docking transform/scale and lighting retained; station mounting, drag, departure and DPR lifecycle unchanged.
Size: Non-Home scale .98; dense-aspect cap .931; perspective depth and continuous scale interpolation retained.
Idle: Existing FlightShip frame owns 5.6-6.6s levitation and 32-40s local +Z axial rotation, with a 1.2s arrival envelope.
Continuity: Depart from displayed idle pose; progress handoff for manual travel; bounded resting resolution; destination-aware HUD approach.
Flight: Precomputed undock/bank, depth climb, broad sweep, descending flyby and rising glide profiles; no forced orbit or new controller.
Layout: Desktop canvas/journey only; lower or opposite-side content space; nested scrolling retained; darker Contact panel protects text.
Lighting: Existing warm key/neutral ambient adjusted after Home; one directional rim; existing point fades; no new postprocessing/shadows.
Audit: Decoded mesh confirms narrow +Z nose and wider -Z engine end; textures/materials and camera projection unchanged.
Protected: Video assets, timestamp mapping, seek scheduler/loading, static fallbacks, horizontal architecture, HUD and content unchanged.
Diagnostics: Development-only pose, idle angle/blend, size estimate, profile and renderer counters; angle/lighting inspection controls.
Validation: lint=0, typecheck=0, test=0 (33 passing), build=0; desktop matrix/checks and recording passed; measurements in journey plan.
Limits: Physical GPU smoothness, station drag/DPR recovery and native VP9 performance still need hardware review.
Next: Owner visual review; no push, merge or deploy. Tune anchors/controls, per-stage size/idle and key/fill/rim in the existing architecture.
