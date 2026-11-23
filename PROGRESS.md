# Progress
Branch: feature/cinematic-space-redesign
Done: Desktop active horizontal journeys now drive deterministic undock/travel/clockwise approach/parking poses in the existing R3F frame controller.
Done: Scroll sampling controls position, quaternion inputs, scale and banking; stopping holds the pose and reverse scrolling retraces it.
Done: Cached journey geometry refreshes outside useFrame; no new animation loop, effects, renderer or per-frame React state.
Done: Navigation keeps priority; interruption captures the current transform and blends by scroll distance. Navigation reveal phases remain separate.
Done: Desktop activation uses viewport width at 1024px to avoid scrollbar-induced mode oscillation; tablet content-fit rules unchanged.
Preserved: Shared active-section source, navigation orbits/history, station model/DPR fallback, backgrounds, content, tablet/mobile and reduced-motion fallbacks.
Validation: lint=0, typecheck=0, test=0 (11 passing), production build=0.
Browser: 1024/1280/1440/1920px slow/fast forward, reverse and stationary transform checks passed; reverse/stop deltas=0, no page errors in final sweep.
Browser: Hero return, navigation flights, manual interruption, rapid HUD retargeting, desktop resizing, station visibility/drag and background visibility checked.
Regression: 768px existing navigation flight, 375px vertical/static fallback and desktop reduced-motion canvas/journey disabling checked.
Next: Continue the cinematic background stages in the existing DOM/CSS stack.
Decisions: Manual phase stays in the sampler; the navigation store remains idle during manual travel to restore interrupted reveal targets.
To tune: Arc width .028, height .18, bank .18, handoff span .045 of journey progress; dock/parking coordinates unchanged.
