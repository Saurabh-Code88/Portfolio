# Progress
Branch: feature/cinematic-space-redesign
Done: Desktop journey now uses 3x native scroll distance and eases its existing track RAF; world, ship, backgrounds, telemetry and active sections consume the same visible position.
Done: Desktop HUD flights run at 1.65x their previous duration and start from the visible journey position during manual-to-navigation handoff.
Done: Full clockwise orbits retain existing geometry; ship enlarges during travel, then settles upright on the right with gentle vertical floating.
Done: Station remains slowly rotating but parks separately near the lower-right corner; section arrivals no longer dock above it.
Done: Existing reveal controller expands headings/cards from the projected ship tail after the orbit, using staggered anisotropic scale, opacity and restrained skew.
Done: Panel contrast fades with expansion; temporary overflow permits the tail reveal, then restores nested scrolling on completion.
Safety: Completed/visited content stays visible; explicit focus handling expands focused sections; mode changes restore readable content and pointer interaction.
Architecture: Existing frame/store/track controllers extended; no new animation loop, renderer, dependency, global scroll listener, light or postprocessing effect.
Preserved: Mobile/tablet/reduced-motion paths, station mounting/drag/DPR fallback, nebula crossfade, content, links, hash/history and navigation retargeting.
Validation: Final lint=0, typecheck=0, tests=0 (26 passing), production build=0. Initial build was cancelled for the final focus-safety adjustment.
Browser: Partial/full tail reveal, upright bobbing, station separation and HUD-arrival assertions exercised; shared preview confirmed 375/768px restoration and reduced-motion mode deactivation.
Browser limits: Full automated interruption sequence remained input/timing-limited; software WebGL was suppressed in one functional harness, with separate rendered preview inspection. Temporary harness removed.
Next: Owner visual tuning of scroll pace and genie-style expansion; no merge or deployment.
To tune: journeyMotion.ts factor=3/response=10; desktop navigation pacing=1.65; reveal begins after orbit at .82 eased progress; floating amplitude=.05 world units.
