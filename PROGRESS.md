# Progress
Branch: feature/ship-polish
Done: Removed blue `dockSprite`, station dock point light, tapered dock beam, and ship `dockingPulse` sphere/point light; preserved station model and orange ship engine glow.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: Removed code-rendered blue lights and their `STATION_DOCK_LIGHT_OFFSET`; no station emissive-material edits were needed. Station and ship placement remain unchanged.
To tune: `STATION_DIAMETER`, `STATION_HERO_CAMERA_FOV`, station breakpoint transforms, station visibility fallback threshold.
