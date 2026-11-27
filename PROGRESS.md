# Progress
Branch: feature/cinematic-space-redesign
Done: Removed the remaining desktop Home rectangle at its actual source: .hero-panel::before's legacy text scrim.
Fix: Suppress Home panel ::before/::after generation only in active desktop canvas + horizontal journey, normal motion.
Interaction: Empty Home section/wrappers ignore pointer events; station window-raycast hover/drag remains functional.
Layout: Wrapper geometry retained; other sections, 375/768px and reduced-motion computed styles unchanged in browser comparison.
Protected: Ship/station models, lighting, scale, docking fit, flight controller, video and HUD code unchanged.
Prior refinement: 4c4ffc1 retains measured idle arrivals, non-Home scale1.37/dense1.3015 and centralized fitted Home composition.
Constants: No scene, motion, light, media, HUD or viewport-fit constants changed in this fix.
Browser: Edge SwiftShader exit0; pseudo removed, geometry unchanged, station hover/drag passed (0.718rad), zero page errors.
Validation: lint=0, typecheck=0, test=0 (36 passed), build=0; browser comparison/interaction exit0.
Next: Owner desktop visual review; no push, merge or deployment.
