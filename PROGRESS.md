# Progress
Branch: feature/ship-polish
Done: Continuous ship flight and interactive desktop rotation; station now has pulsing red antenna and chasing rim emitters, live preview tuning, and HDR-threshold bloom.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: +Z is the ship's front, engines at -Z; station bounds confirm +Y up; station uses only two point lights; bloom is disabled for low-power/reduced-motion scenes.
To tune: flight waypoints in lib/flightPath.ts; drag settings in lib/rotation.config.ts; antenna and rim offsets/pattern in lib/station.config.ts.
