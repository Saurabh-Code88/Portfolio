# Progress
Branch: feature/cinematic-space-redesign
Done: Navigation and cockpit HUD now consume one shared active-section source; percentage-margin observers removed.
Done: Horizontal detection reads journey scroll geometry and measured panel boundaries; vertical detection uses a viewport-height reading line.
Done: Resize, layout/content changes and reduced-motion changes refresh measurements; 12px hysteresis prevents boundary flicker.
Preserved: Horizontal journey, URL/history handling, orbital flights, flight trajectories and station DPR fallback.
Validation: lint=0, typecheck=0, test=0 (7 passing), build=0.
Browser: 1280px/375px forward/reverse scrolling, 1023/1024px transition, resize roundtrip, reduced-motion toggle, navigation/rapid retargeting, back/forward and project expansion checked.
Browser: Boundary jitter stayed stable; stationary scroll delta was 0. Existing canvas context-loss diagnostic appeared during mode-switch teardown; fresh-page flight checks passed.
Next: Continue the cinematic background stages in the existing DOM/CSS stack.
Decisions: Detection only reads geometry; event-coalesced measurements introduce no animation controller or scroll writes.
To tune: Active-section tolerance 12px; vertical reading line 28% of viewport height. Existing journey breakpoints unchanged.
