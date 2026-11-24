# Progress
Branch: feature/cinematic-space-redesign
Done: Desktop station now turns visibly and slowly around its vertical axis (0.05 rad/s) inside the existing R3F frame controller.
Done: Station moves smoothly from the hero into the right-side gutter and shrinks to 14% viewport width during departure.
Done: Its docking point sits directly below the ship's existing side parking position, for both HUD navigation and manual section arrival.
Done: Manual desktop scrolling samples the same clockwise orbit and Bezier primitives as HUD flights, with travel/orbit/settle phases.
Done: Orbit progress is deterministic, stops with scrolling and reverses along the same path; heading, scale and bank settle continuously.
Done: One-pixel endpoint tolerance handles browser scroll rounding without leaving the manual flight layer active at section stops.
Architecture: Orbit/Bezier primitives moved unchanged to orbitPath.ts and re-exported through flightPath.ts; existing navigation geometry retained.
Preserved: Navigation ownership/retargeting/interruption handoff, station mounting/drag/DPR fallback, backgrounds, active sections and reveals.
Scope: New station spin/composition/orbit sampling requires the existing desktop journey; mobile/tablet/reduced-motion paths remain unchanged.
Validation: lint=0, typecheck=0, tests=0 (23 passing), production build=0; focused tests cover exact orbit matching, stop/reverse and continuous joins.
Browser limitation: Shared preview repeatedly reset to a narrow viewport; fixed-size headless preview did not hydrate. Desktop visual checks remain unconfirmed.
Next: Owner visual check of orbit amplitude and side docking composition; no merge or deployment.
To tune: STATION_JOURNEY_SPIN=.05, STATION_SIDE_WIDTH=.14; scroll orbit travel/orbit boundaries=.28/.82 with quintic progress easing.
