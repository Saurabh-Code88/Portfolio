"use client";

import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { BACKGROUND_SOURCE, ENABLE_3D_SHIP, LOW_POWER_CORE_THRESHOLD } from "@/lib/ship.config";
import { journeyRevealPosition } from "@/lib/horizontalJourney";
import { cinematicCoordinate, cinematicVideoTime } from "@/lib/cinematicTimeline";
import { cinematicDiagnostics } from "@/lib/cinematicDiagnostics";
import { attachVideoScrubber } from "@/lib/videoScrub";
import { canUseBackgroundJourney, videoParallax } from "@/lib/backgroundJourney";

const SpaceBackgroundCanvas = dynamic(() => import("@/components/space/SpaceBackgroundCanvas"), {
  ssr: false,
  loading: () => null,
});

type DisplayMode = "fallback" | "active";

class CanvasErrorBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

/** Resolve display mode with URL overrides (?ship=on|off) and debug logging (?debug=1). */
function resolveMode(): DisplayMode {
  const params = new URLSearchParams(window.location.search);
  const shipOverride = params.get("ship");     // "on" | "off"
  const debug = params.get("debug") === "1";

  // URL overrides
  if (shipOverride === "off") {
    if (debug) console.info("[ship] canvas OFF — ?ship=off override");
    return "fallback";
  }
  if (shipOverride === "on") {
    if (debug) console.info("[ship] canvas ON — ?ship=on override (forced)");
    return "active";
  }

  // Auto-detect
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrowViewport = window.innerWidth < 768;
  const lowPower =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= LOW_POWER_CORE_THRESHOLD;
  const webgl = supportsWebGL();

  if (debug) {
    const reason =
      reducedMotion ? "prefers-reduced-motion" :
      narrowViewport ? `narrow viewport (${window.innerWidth}px < 768)` :
      lowPower ? `low-power device (${navigator.hardwareConcurrency} cores <= ${LOW_POWER_CORE_THRESHOLD})` :
      !webgl ? "WebGL not supported" :
      "all checks passed";
    const on = !reducedMotion && !narrowViewport && !lowPower && webgl;
    console.info(`[ship] canvas ${on ? "ON" : "OFF"} — ${reason}`);
  }

  const canAnimate = !reducedMotion && !narrowViewport && !lowPower && webgl;
  return canAnimate ? "active" : "fallback";
}

export function SpaceBackground() {
  if (!ENABLE_3D_SHIP) return null;
  return <EnabledSpaceBackground />;
}

function EnabledSpaceBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<DisplayMode>("fallback");
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMode = () => setMode(resolveMode());
    updateMode();
    window.addEventListener("resize", updateMode, { passive: true });
    reducedMotion.addEventListener("change", updateMode);
    return () => {
      window.removeEventListener("resize", updateMode);
      reducedMotion.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    backgroundRef.current?.classList.toggle("space-background--active", mode === "active");
    backgroundRef.current?.classList.toggle("space-background--fallback", mode === "fallback");
    document.body.classList.toggle("space-canvas-active", mode === "active");
    document.body.classList.toggle("space-background--fallback", mode === "fallback");
    document.body.classList.add("space-background-present");
    return () => {
      document.body.classList.remove("space-canvas-active");
      document.body.classList.remove("space-background--fallback");
      document.body.classList.remove("space-background-present");
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "active") return;
    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = ((event.clientX / window.innerWidth) - 0.5) * 10;
      const y = ((event.clientY / window.innerHeight) - 0.5) * 8;
      document.body.style.setProperty("--space-pointer-x", `${-x}px`);
      document.body.style.setProperty("--space-pointer-y", `${-y}px`);
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      document.body.style.removeProperty("--space-pointer-x");
      document.body.style.removeProperty("--space-pointer-y");
    };
  }, [mode]);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const data = window.matchMedia("(prefers-reduced-data: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const lowPower =
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= LOW_POWER_CORE_THRESHOLD;
    const video = videoRef.current;
    if (!video) return;
    let attached = false,
      failed = false,
      disposed = false,
      hasFrame = false;
    const mp4 = "/backgrounds/space-background-scrub.mp4",
      webm = "/backgrounds/space-background-scrub.webm";
    const scrubber = attachVideoScrubber(
      video,
      (sample) => {
        Object.assign(cinematicDiagnostics, {
          targetTime: sample.target,
          decodedTime: sample.decoded,
          seekLag: sample.lag,
          seekMs: sample.seekMs,
          seeks: sample.seeks,
          coalesced: sample.coalesced,
          decodedBy: sample.by,
        });
      },
      () => {
        hasFrame = true;
        background.dataset.videoState = "ready";
      },
      (recoverable = false) => {
        background.dataset.videoState = hasFrame ? "held" : "poster";
        failed = !recoverable;
      },
    );
    const onError = () => {
      if (!attached || disposed) return;
      background.dataset.videoState = "poster";
      if (
        video.getAttribute("src") === mp4 &&
        video.canPlayType('video/webm; codecs="vp9"')
      ) {
        hasFrame = false;
        scrubber.reset();
        video.src = webm;
      } else {
        failed = true;
        video.pause();
      }
    };
    const sync = () => {
      if (disposed) return;
      const journey = journeyRevealPosition.getSnapshot();
      const enabled = canUseBackgroundJourney(
        Boolean(journey),
        window.innerWidth,
        motion.matches,
        data.matches || Boolean(connection?.saveData),
        lowPower,
        BACKGROUND_SOURCE === "image",
      );
      background.classList.toggle(
        "space-background--desktop-journey",
        Boolean(journey) && window.innerWidth >= 1024 && !motion.matches,
      );
      background.classList.toggle("space-background--journey", enabled);
      background.toggleAttribute("data-atmosphere-paused", document.hidden);
      video.pause();
      if (!enabled && attached) {
        attached = false;
        hasFrame = false;
        scrubber.reset();
        video.removeAttribute("src");
        video.removeAttribute("poster");
        video.load();
        background.dataset.videoState = "poster";
      }
      if (!enabled || !journey || failed || document.hidden) return;
      if (!attached) {
        attached = true;
        video.muted = true;
        video.poster = "/backgrounds/space-background-poster.webp";
        // H.264 with no B-frames is the baseline random-access path; WebM is a media-error fallback.
        video.src = mp4;
        video.load();
      }
      const coordinate = cinematicCoordinate(journey.x, journey.panels);
      const target = cinematicVideoTime(coordinate, video.duration);
      cinematicDiagnostics.progress = coordinate / (journey.panels.length - 1);
      scrubber.target(target);
      background.style.setProperty(
        "--video-x",
        `${videoParallax(journey.x, journey.panels.at(-1)?.offset ?? journey.width, window.innerWidth)}px`,
      );
    };
    video.addEventListener("error", onError);
    video.addEventListener("loadedmetadata", sync);
    const unsubscribe = journeyRevealPosition.subscribe(sync);
    motion.addEventListener("change", sync);
    data.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    window.addEventListener("resize", sync, { passive: true });
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      scrubber.dispose();
      unsubscribe();
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", sync);
      motion.removeEventListener("change", sync);
      data.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const handleFailure = () => setMode("fallback");
  return (
    <>
      <div ref={backgroundRef} className={`space-background space-background--fallback space-background--${BACKGROUND_SOURCE}`} aria-hidden="true">
        <div className="space-background__image" />
        <video ref={videoRef} className="space-background__video" muted playsInline
          preload="auto" controls={false} disablePictureInPicture tabIndex={-1} aria-hidden="true" />
        <div className="space-background__reading-scrim" />
        <div className="space-background__atmosphere" />
        <div className="space-background__stars space-background__stars--far" />
        <div className="space-background__stars space-background__stars--near" />
        <div className="space-background__vignette" />
      </div>
      <div className={`space-background-canvas space-background-canvas--${mode}`} aria-hidden="true">
        {mode === "active" && (
          <CanvasErrorBoundary onFailure={handleFailure}>
            <SpaceBackgroundCanvas scrollProgress={scrollYProgress} />
          </CanvasErrorBoundary>
        )}
      </div>
    </>
  );
}
