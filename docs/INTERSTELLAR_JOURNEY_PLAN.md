# Continuous cinematic desktop background

The owner superseded the six-environment design with one continuous video.
The deleted six-region assets remain deleted. No section-specific background loader,
configuration, compositing planes or atmospheric animation is active.

## Source and reproducible optimization
The actual supplied path is `public/backgrounds/space-background.mp4`, not the proposed
`public/space-background.mp4`. FFmpeg verified H.264 High/yuv420p, 1920x1080, 30 FPS,
20.00 seconds, no audio, 9,808,313 bytes. Preserve it byte-for-byte.
Run `python scripts/prepare-space-video.py /path/to/ffmpeg` with libx264/libvpx-vp9/libwebp.
The tooling was installed temporarily outside the repository; no runtime dependency added.

The 18-second derivative begins at source t=2. Source t=2..18 plays normally, then
source t=18..20 dissolves into source t=0..2 over two seconds. The final composition
therefore joins the first at source t=2, without a browser-side second decoder.
Encode at native 1080p/30 FPS: H.264 CRF22 slow with faststart, VP9 CRF32/cpu-used4.
Poster is source t=2, matching loop start; static mobile derivative is 768x432.

## Persistent playback
`SpaceBackground` owns one always-mounted, decorative HTML video behind the existing
ship/station canvas and DOM content. It is autoplay/muted/playsInline/loop with controls
disabled, no pointer events, cover fit and 2% overscan. Section changes never set src,
seek currentTime, key the player or control playback. VP9-capable browsers choose WebM;
otherwise H.264. A WebM media error retries MP4; exhausted errors/autoplay rejection
leave the static poster visible. The source original is not a browser fallback.

Only desktop horizontal journey >=1024px with normal motion/data/power attaches a video
source. Mobile/tablet/reduced-motion users retain static layout/background behavior,
using regenerated poster images because the owner deleted the previous static artwork.
A mode change pauses and detaches media; returning to eligible mode may restart playback.
Hidden documents pause; foreground restores playback from the paused position.

## Environmental movement and readability
The existing measured journey publisher writes a CSS horizontal translation, bounded
at 1.2% of viewport width. This fits inside 2% overscan with no scale animation or shake.
Playback progresses with wall time even when scrolling stops. Existing scrims and a
localized transparent left scrim protect content without introducing portfolio copy.
No new global scroll listener, RAF, WebGL renderer, shader or lighting was added.

## Home station and protected systems
Existing Home-only station transforms remain unchanged: departure over .02-.82 of the
Home-to-Toolkit span translates it offscreen/deeper and scales it down; invisible groups
cannot be hit-tested. Reverse progress restores its base position/scale. Station mounting,
rotation/drag and reversible DPR protection retain their lifecycle.
Horizontal journey, ship geometry/controller, destination choreography, navigation,
interruptions, active-section detection, reveal timing, HUD and content are unchanged.

## Asset sizes and validation
| Asset | Bytes |
|---|---:|
| Original MP4 (preserved) | 9,808,313 |
| Seamless WebM | 4,214,623 |
| Seamless MP4 | 8,701,466 |
| Desktop poster | 63,982 |
| Mobile still | 19,704 |

One chosen video is downloaded, not both in normal playback. WebM is about 57% smaller
than the source; MP4 retains similar source bitrate and fine detail with a shorter runtime.
Both derivatives are 1920x1080/30 FPS, 18 seconds, 540 frames, yuv420p and audio-free.
Decoded 64x36 grayscale analysis found zero frames with >99% near-black pixels.
MP4 wrap MAE=0.9748 versus median adjacent MAE=0.8294/max=1.1693; WebM wrap
MAE=0.9961 versus median=0.8320/max=1.2361. Thus the encoded wrap falls within
normal frame-to-frame changes. This numerical check does not replace visual review.

Lint/typecheck/tests have exited 0; 25 tests passed (eligibility, bounded reversible
parallax, Home-only station restoration and existing protected-system suites).
Production build exited 0. An old development preview overwrote the shared build output
when first visited; its verified Portfolio process was stopped, and a clean rebuild also
exited 0. Final browser checks used a fresh production server on port 3001.

Browser checks at 1024/1280/1440/1920 verified one persistent player, one metadata load,
advancing time through manual/reverse scrolling and distant HUD retargeting/interruption,
cover fit, no pointer interception, no horizontal overflow and canvas visibility.
A seek near the end crossed the native loop from 17.6s to 0.91s while still playing.
Visibility simulation held currentTime=12.045723 when hidden, then resumed to 12.477839.
The integrated page reported document.hidden=true even after bringToFront, so foreground
playback tests explicitly simulated visibility. Actual hidden startup loaded no video.
768px and 375px had no video src; 375px requested only the 19,704-byte mobile still.
Reduced motion at 1280px had no video src and used the static poster. Canvas-disabled
mode played video; canvas-enabled checks retained one visible canvas at every tested width
and loaded both ship/station models without remount requests on navigation.
Forced WebM failure recovered to playing MP4; forcing both formats to fail left poster
state and video opacity=0. Expected forced-network errors were separate from normal runs,
which had no observed page errors. Existing Three.Clock deprecation warning remains.

## Remaining limits
An inspectable screenshot confirmed video/ship/Home station compositing, but the
integrated browser screenshot clipped rendering to its host surface despite emulated
viewport dimensions. Full-screen visual readability, actual GPU loop perception, station
drag and later-section station absence still need hardware visual review. Deterministic
station departure/restoration tests pass and the previously implemented transforms were
preserved. Foreground/background lifecycle was tested with simulated visibility events.
No destination-specific flight choreography was changed; no merge or deployment.
