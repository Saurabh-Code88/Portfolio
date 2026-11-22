# Progress
Branch: feature/ship-polish
Done: Hero flight now follows one continuous Catmull–Rom path with tangent-based orientation, damped scroll progress, and synchronized eased navigation flights.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; station bounds confirm +Y up; MCP remains read-only.
To tune: flight waypoints in lib/flightPath.ts; manual progress damping in SpaceBackgroundCanvas.tsx; navigation duration is 1500 ms.
