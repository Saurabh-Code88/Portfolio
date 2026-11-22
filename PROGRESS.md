# Progress
Branch: feature/ship-polish
Done: Glass UI pass; station diagnostics, cached-asset cleanup safety, and config-based viewport placement.
Root cause: Hidden-tab RAF throttling measured 28.4 FPS and triggered the station's 30 FPS auto-hide; it now ignores hidden tabs and startup dips.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: Cached useGLTF scenes remain shared; only per-mount clones are disposed. Station placement is independent of scroll progress; visible tabs need two sub-30 FPS windows after a 2-second warmup to auto-hide.
To tune: `STATION_DIAMETER`, `STATION_HERO_CAMERA_FOV`, station breakpoint transforms; station visibility fallback remains at 30 FPS sustained.
