# Progress
Branch: feature/cinematic-space-redesign
Done: Added station transform, visibility, mount, and render-state diagnostics for development.
Next: Reproduce station disappearance with sustained drag, section navigation, and scroll; then fix only the confirmed trigger.
Root cause: Not reproduced in over 60 seconds; the only known station-removal path is the sustained-low-FPS callback after two windows below 30 FPS.
Decisions: No behavior changes without reproduction evidence; GLTF clones remain isolated from cached source assets.
To tune: Diagnostic sampling interval (0.5s) and transform-change threshold (0.08 world units).
