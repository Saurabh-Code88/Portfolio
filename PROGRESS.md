# Space ship theme implementation progress

## Done
- Steps 1–5 complete: source assets and dependencies, `/dev/ship`, optional desktop 3D hero, section flight path, and accessibility/performance fallbacks.
- Step 6 implementation complete: skip-flight navigation, DPR caps, resource disposal, responsive/reduced-motion/low-core/WebGL/error fallbacks.
- Agent context rules appended to `AGENTS.md` in this maintenance step.

## Next
- Run step 6 lint, typecheck, tests, and build; record final bundle and asset sizes.

## Decisions
- Optional 3D remains controlled by `ENABLE_3D_SHIP`; static CSS/starfield paths cover unsupported or constrained devices.
- Background source and ship model licensing remain marked TO CONFIRM in `public/CREDITS.md`.
- Ship model optimizer was unavailable; `public/models/ship.glb` remains an unchanged copy (6,563,284 bytes).
- Build previously reported `/dev/ship` at 1.83 kB route JS / 108 kB first-load JS; R3F loads dynamically.

## Constants to tune
- `lib/ship.config.ts`: orientation, scale, nozzle offsets, and scan axis remain TODO guesses.
