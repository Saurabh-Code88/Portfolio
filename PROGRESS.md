# Progress
Branch: feature/cinematic-space-redesign
Done: Desktop planetary-to-nebula crossfade consumes the existing journey publication; no new scroll listener, animation loop or per-frame React state.
Done: Configurable smoothstep spans .08 to .98 of measured hero-to-toolkit travel; forward/reverse/stop and HUD flights share the same mapping.
Done: Persistent planet underlay remains until nebula load/decode succeeds; late readiness fades for 1s and failures retain the planet.
Done: Nested nebula drift/scale and journey/pointer parallax preserve rich artwork; existing stars provide restrained depth; hidden documents pause atmospheric motion.
Done: Backdrop stays at z=0; only the transparent canvas wrapper follows existing orbit layering. Desktop flight no longer hides background layers.
Assets: Original public/backgrounds/nebula.png retained unchanged, 1660x948 / 2,380,439 bytes; app uses nebula-desktop.webp, same dimensions / 241,464 bytes.
Preserved: Ship geometry/sampler/orbits, station lifecycle/DPR fallback, active-section detection, reveals, HUD, content and procedural alternative.
Validation: lint=0, typecheck=0, test=0 (18 passing), production build=0; production preview confirmed decoded WebP and active canvas.
Browser: 1024/1280/1440/1920px departure, halfway hold, deep travel, reverse, resize, HUD orbits/retargeting/interruption and reveal completion checked without application page errors.
Browser: Station remained visible and drag rotation worked; hero return restored planet-only composition; backdrop stayed visible during orbital maneuvers.
Loading: Delayed and failed image requests retained planet; canvas-disabled crossfade passed; visibility events paused/resumed CSS motion.
Regression: Zero nebula requests at 768px/375px, reduced motion, Save Data and simulated low-power devices; original planet assets retained.
Decisions: Crossfade overlays the decoded nebula over the original planet composition to prevent transparency/black-frame gaps; no global dark overlay on nebula.
Next: Owner visual review of the completed environmental journey; larger source artwork only if needed for higher-resolution displays.
To tune: backgroundJourney.ts start=.08/end=.98/parallax=.018; CSS nebula drift=160s, scale=1.035 to 1.055; native art remains 1660x948.
