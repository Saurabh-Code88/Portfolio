# Progress
Branch: feature/ship-polish
Done: Step 1a adds warm engine-side key light, cool ion rim light, a restrained procedural reflection environment, and a larger upper-right three-quarter hero ship.
Next: 1b engine glow.
Then: 2 hull scan with the Ask form, 3 tool labels in Toolkit, 4 small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; hero-only scale returns to 1 during flight; hero interaction area starts clear of the content column.
To tune by eye: HERO_SHIP_SCALE, HERO_SHIP_POSITION, HERO_SHIP_ROTATION, light positions/intensities, Lightformer colors/intensities, hero-ship-trigger bounds.
Checks: viewport layout/interaction overlap checked at 768px, 1280px, and 1920px; no browser console errors; lint and typecheck pass. Build command finished, result unavailable in captured output.
