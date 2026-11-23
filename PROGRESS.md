# Progress
Branch: feature/ship-polish
Done: Redesigned hero layout with mirrored HudFrames, centered frustum-sized station, nose-up ship idle spin, and inline static fallback art.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: Existing content and Fly to navigation are unchanged. Reduced-motion and fallback modes skip frame draw-in; ship spin pauses during drag and the reset delay.
To tune: `STATION_BREAKPOINT_OVERRIDES`, `SHIP_IDLE_SPIN`, `HERO_SHIP_BREAKPOINT_OVERRIDES`, HudFrame draw/stagger timings.
