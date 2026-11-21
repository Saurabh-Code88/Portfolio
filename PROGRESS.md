# Space ship theme implementation progress

## Done
- Step 1 — Assets: source assets copied into `assets-src/`; background resized and exported; ship optimization attempted, then unchanged copy used after npm registry returned `ECOMPROMISED`. Credits file added with licenses to confirm. Scene defaults are in `lib/ship.config.ts`; orientation, scale, nozzle offsets, and scan axis are TODO guesses. Assets commit: `8a888ff`.
- Step 2 — Dependencies: installed Three.js 0.187.0, `@types/three` 0.187.0, Fiber 9.8.2, Drei 10.7.9, and React Three Postprocessing 3.2.2. `npm ls` exits cleanly with React 19.3.1 and Next 15.5.29.
- Step 3 — Ship preview: `/dev/ship` is a client-only, lazy-loaded R3F route with orbit controls, axes/grid, procedural lightformers, bloom, endpoint labels, and additive nozzle sprites/cones/lights. Lint, typecheck, all 8 tests, and build pass.
- Step 4 — Site background and hero ship: active desktop mode lazy-loads a transparent full-screen canvas after the hero, with image/procedural CSS backdrops, star parallax, boot streaks, idle pointer tilt, and a cooldown barrel-roll/engine flare trigger. Reduced-motion, narrow, low-core, unsupported WebGL, and canvas-error paths use the static CSS background. `ENABLE_3D_SHIP=false` removes the optional background/canvas and keeps the existing hero starfield.

## Next
- Step 5 — Add section-linked flight path and navigation/effects.
- Step 6 — Finalize fallbacks, performance, and skip-flight navigation, then rerun lint, typecheck, tests, and build.

## Decisions
- The supplied background image is a 1002×768 PNG, preserved unchanged as `assets-src/space-bg.png`; it was upscaled with Lanczos to 2560×1962 and exported as progressive JPEG quality 80 (275,763 bytes).
- Ship source is preserved as `assets-src/textured_mesh.glb`. The requested optimizer could not be installed/run: sandbox access was denied, and the network-enabled retry returned npm `ECOMPROMISED`. Per the fallback instruction, `public/models/ship.glb` is an unchanged copy (6,563,284 bytes).
- The attached background's original creator/source and license were not supplied; `public/CREDITS.md` marks them TO CONFIRM.
- No API routes, content data, tests, or `docs/PORTFOLIO_STATUS.md` were changed.
- Dependency install completed with no reported peer conflicts; `npm ls three @types/three @react-three/fiber @react-three/drei @react-three/postprocessing react next` exits 0.
- The preview route reports 1.83 kB route JS / 108 kB first-load JS in Next build output; the R3F canvas is loaded through a dynamic chunk after the route mounts.
