# Progress
Branch: feature/ship-polish
Done: Flight path uses one Catmull–Rom route with damped scroll and synchronized section navigation; ship and station support desktop pointer rotation with quaternion inertia and idle reset.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; station bounds confirm +Y up; MCP remains read-only.
To tune: flight waypoints in lib/flightPath.ts; drag sensitivity, inertia damping, and idle reset in lib/rotation.config.ts.
