# Progress
Branch: feature/ship-polish
Done: Glass UI pass; station loading now explicitly enables Meshopt, normalizes from a logged source bounding box, and reports render/load failures.
Root cause: station load failures were swallowed by a null Suspense fallback without a station-specific error boundary or diagnostics.
Next: Toolkit tool labels.
Then: Small content and metadata fixes.
Decisions: Station path is tracked and matches `/models/station.glb`; 45% frustum width target fits the right half at the hero depth; camera near/far are 0.1/120 and the station is about 8.35 units away.
To tune: `STATION_DIAMETER` in lib/station.config.ts controls normalized width; low-power/reduced-motion fallbacks remain enabled.
