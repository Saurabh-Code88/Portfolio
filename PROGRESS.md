# Progress
Branch: feature/cinematic-space-redesign
Done: Measured arrival regions + .28s scroll settling recover manual idle without snapping scroll.
Idle: .85s rest blend, existing .8s interruption handoff, 1.2s idle envelope; mid-flight holds remain deterministic.
Motion: .045-.05 levitation, 5.6-6.6s periods and 32-40s local +Z roll; single existing transform owner.
Size: Non-Home scale 1.37 (dense 1.3015), approximately 40% larger projected resting dimensions.
Home: Central fitted ship/station composition; actual runtime bounds and compact full-yaw vertex profile.
Framing: Fixed 45-degree ship axial angle; station yaw90/pitch-.18; combined projection centered with HUD reserves.
Clearance: Drag fits station only; zero-angle continuity covered; ship Home anchor/path stays fixed through station drag.
Content: Desktop canvas/journey hides Home overlays and controls reversibly; accessible identity/fallback content preserved.
Lighting: Home frontal warm-white key3.2/fill.50/rim1.4 blends to existing destination lighting; materials unchanged.
Flight: Existing spline controls, banks, XYZ excursions, navigation ownership and Home-only station departure retained.
Protected: Video assets/scheduler/time mapping, GLBs, content sources, mobile/tablet/reduced-motion and reveal architecture unchanged.
Diagnostics: Development-only measured eligibility, motion/blends, model bounds/scale, levitation and station drag readouts.
Validation: lint=0, typecheck=0, test=0 (36), build=0; final behavior, DPR simulation and production browser exit0.
Evidence: Four-width desktop/Home matrices, six screenshots, drag, 849867-byte recording/decode0, sizes and production results in docs/validation/refinement/.
Limits: Software rendering cannot establish physical GPU pacing; wide short viewport caps Home enlargement; video seek latency unchanged.
Next: Owner hardware-GPU/full-speed visual review; use a fresh session for further tuning. No push, merge or deployment.
