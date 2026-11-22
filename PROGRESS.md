# Progress
Branch: feature/ship-polish
Done: Step 1a adds amber engine-side key lighting, a cool ion rim, procedural metal reflections, and responsive three-quarter hero framing.
Next: 1b engine glow.
Then: 2 hull scan with the Ask form, 3 tool labels in Toolkit, 4 small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; hero scale and horizontal position adapt to viewport aspect ratio.
To tune by eye: HERO_SHIP_SCALE (2.5), HERO_SHIP_POSITION (1.5, -0.1, 0), HERO_SHIP_ROTATION (-0.15, 0.55, 0.08), key/rim positions and intensity, Lightformer colors and intensity.
Checks: lint, typecheck, and build pass. Reviewed the hero at 768px, 1280px, and 1920px; text and ship remain separated.
