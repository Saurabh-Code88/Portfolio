# Progress
Branch: feature/cinematic-space-redesign
Done: Replaced destructive station FPS removal with reversible DPR quality fallback; dev simulation verified low-FPS and recovery transitions without unmount.
Next: Continue section-mapped planetary and nebula transitions in the existing DOM/CSS background stack.
Root cause: Removed confirmed low-FPS station-removal path; this does not establish the cause of every previously reported disappearance.
Decisions: Keep interaction and station mounted; reduce Canvas DPR to 1 after two <30 FPS windows, restore after three >=45 FPS windows with a 3s cooldown.
To tune: 1.5s sample window, 30/45 FPS thresholds, 2/3 hysteresis windows, 3s cooldown, 8s dev simulation.
