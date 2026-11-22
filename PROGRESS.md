# Progress
Branch: feature/ship-polish
Done: Step 1a ship lighting and framing; Ask chat removed; hero CTAs, content-sourced proof points, and Fly to station bar added; station docking now scales/positions from camera frustum with desktop/tablet presets and live tuning sliders.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; station bounds X 0.85 / Y 0.35 / Z 1.19 confirm +Y up, no correction rotation; MCP exposes get_projects, get_project, get_experience, and get_research.
To tune by eye: HERO_SHIP_SCALE, HERO_SHIP_POSITION, HERO_SHIP_ROTATION, STATION_SCALE, desktop/tablet width and transform overrides, STATION_POSITION, STATION_ROTATION, DOCK_POINT, DOCK_HOVER_HEIGHT, glow offsets.
