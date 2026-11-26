> Current direction: scroll-synchronized chronological video and true 3D desktop splines.
> The six-region and autonomous-loop directions are superseded.
> See [the current journey plan](./INTERSTELLAR_JOURNEY_PLAN.md).

# Cinematic redesign architecture audit

## Existing architecture
- The homepage mounts one fixed, pointer-transparent `SpaceBackground` behind semantic page sections; its optional React Three Fiber canvas renders the ship, station, stars, lighting, environment, streaks, and bloom together.
- `BACKGROUND_SOURCE` in `lib/ship.config.ts` is still used by `SpaceBackground` to select a CSS class. It is currently `"image"`; the image layer references `/backgrounds/space-bg.jpg`. The alternate procedural state is a CSS radial-gradient treatment. The DOM also overlays CSS star layers and a vignette. Active desktop mode adds subtle pointer parallax to the image; fallback mode retains the CSS artwork and static DOM ship.
- `lib/flightPath.ts` defines ordered section IDs, a Catmull-Rom waypoint curve, sampling/easing helpers, scroll-derived section stops, and `flightProgressStore` (`sectionId`, `targetSectionId`, normalized `progress`, `isFlying`, `isParked`, `phase`).
- `SpaceBackgroundCanvas.tsx` owns actual 3D ship/station transforms in a single `useFrame` callback. Navigation click handling starts an `OrbitFlight`; a separate requestAnimationFrame scrolls the document through the travel beat. Framer Motion `useScroll` supplies manual scroll progress, which the frame loop damps before sampling. It computes target bounds from the section rect and animates travel, orbit, settle, or idle/park state. A CSS body class raises/lowers the existing canvas for the orbit layering effect.
- User rotation is layered on nested model groups. Pointer drag updates the user quaternion; the frame loop applies inertia and idle reset. Hero spin, hover, and pointer tilt are also applied in the frame loop. Navigation uses anchors plus an IntersectionObserver for the active readout. Fallback links use a separate eased-scroll RAF (instant when reduced motion is requested).
- `SectionRevealController` subscribes to the flight store, hides the target during travel, springs its reveal at orbit start, and restores it on idle. Manual section reveals use IntersectionObserver and Framer Motion. `SiteNav` has its own IntersectionObserver and scrolls the mobile active item into view.

## Completed features to retain
- Cockpit HUD/readout, section anchors and active readout.
- Hero ship/station composition and docking behavior.
- Readout-triggered ship parking and manual-scroll parking.
- Section orbit flights, scroll synchronization, cancellation/retargeting, section reveal, and `/dev/flight` timing controls.
- Desktop drag rotation/inertia with idle reset and static/reduced-motion/low-power/WebGL fallbacks.

## Missing features for living backgrounds
- No planetary or nebula background layers currently transition by section. The existing image layer and CSS-generated procedural backdrop are global and static apart from pointer parallax.
- There is no section-to-background mapping, transition duration/configuration, background asset preloading policy, or reduced-data treatment for multiple large images.
- `flightProgressStore` can trigger section/target/phase transitions. Its numeric progress is published by the frame loop and can update frequently; avoid subscribing a React-rendering background tree to every progress tick. Use section/phase edges for discrete crossfades, or a throttled/direct CSS-variable bridge for continuous blending.

## Recommended implementation sequence
1. Define the existing section IDs to background-layer mapping and transition behavior, keeping the current image/procedural fallback intact.
2. Add planetary/nebula layers as absolutely positioned DOM/CSS backgrounds inside `SpaceBackground`, below the existing canvas and page content; keep text/content semantic and untouched. Prefer CSS opacity/transform crossfades and use the store's section/target/phase for flight-aware transitions.
3. Add lazy loading/preloading for only adjacent/target layers, cap image dimensions, and respect reduced motion, narrow viewport, low-power, and WebGL-failure modes.
4. Verify layer stacking during `orbit-flight-active`/`orbit-flight-behind`, fallback visibility, and no extra per-frame React renders; then validate at mobile and desktop sizes.
5. Separately consider smoothing the existing orbit scale boundary: `SpaceBackgroundCanvas.tsx` selects scale as 1 or 0.8 by the sign of `sin(angle)`, while travel ends at 1 and settle starts its interpolation at 1. These transitions are discontinuous; correct only if included in a later flight task.

## Relevant source files
- `lib/flightPath.ts` — curve, section stop calculation, easing, flight progress store.
- `lib/ship.config.ts` — background source switch and flight/ship timing and composition constants.
- `lib/station.config.ts` — station and docking transforms/breakpoints.
- `components/space/SpaceBackground.tsx` — fallback selection and DOM background layers.
- `components/space/SpaceBackgroundCanvas.tsx` — Three.js scene, flight timeline, section bounds, z-layer state.
- `components/ship/ShipModel.tsx`, `components/station/StationModel.tsx` — model rendering and effects.
- `components/hero.tsx`, `components/site-nav.tsx` — hero and section navigation.
- `components/section-reveal-controller.tsx` — flight-store and in-view section reveals.
- `components/cockpit-frame.tsx`, `app/globals.css`, `app/page.tsx`, `app/layout.tsx` — viewport frame, stacking, homepage composition, and shared navigation.
- `app/dev/flight/FlightPreview.tsx` — existing flight timing controls.

## Conflicts and performance risks
- Keep the new backgrounds in the existing DOM/CSS background stack. A second WebGL canvas or second renderer would add GPU work, memory, and possibly a competing animation loop while the current scene already renders continuously on capable desktop devices.
- Do not let background React state update on every store progress publication. Prefer CSS custom properties or narrowly subscribed section/phase changes to prevent homepage-wide rerenders.
- Multiple large textures can increase decode time, GPU memory, bandwidth, and mobile jank. Lazy-load/limit resolution and retain the current lightweight CSS fallback.
- Preserve existing z-index choreography: the canvas changes layers around the content during orbit, while CSS background layers are hidden during active flight. New layers must remain behind content and must not cover or flash during those swaps.
- Existing flight scale has a visible discontinuity at travel-to-orbit and orbit upper/lower transitions; avoid coupling background transitions to ship scale or transform state.
