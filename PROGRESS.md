# Progress
Branch: feature/cockpit-hud
Done: Fitted the docked ship below the header and kept the station within the frustum at desktop and tablet sizes.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: Station width remains frustum-based; ship nose clearance is derived from measured model bounds and viewport height. Header height assumption: 68px.
To tune: `HERO_SHIP_SCALE`, `HERO_SHIP_TOP_CLEARANCE`, `HERO_SHIP_TOP_RESERVE`, `HERO_SHIP_HEADER_HEIGHT`, `DOCK_HOVER_HEIGHT`, `DOCK_ENGINE_CLEARANCE`, and breakpoint overrides.
