"use client";

import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { BACKGROUND_SOURCE, ENABLE_3D_SHIP, LOW_POWER_CORE_THRESHOLD } from "@/lib/ship.config";
import { journeyRevealPosition } from "@/lib/horizontalJourney";
import { BACKGROUND_JOURNEY, backgroundBlend, canUseBackgroundJourney } from "@/lib/backgroundJourney";

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
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const lowPower = typeof navigator.hardwareConcurrency === "number"
      && navigator.hardwareConcurrency <= LOW_POWER_CORE_THRESHOLD;
    let image: HTMLImageElement | null = null;
    let status: "idle" | "loading" | "ready" | "error" = "idle";
    let disposed = false;

    const sync = () => {
      const journey = journeyRevealPosition.getSnapshot();
      const enabled = canUseBackgroundJourney(Boolean(journey), window.innerWidth, motion.matches,
        data.matches || Boolean(connection?.saveData), lowPower, BACKGROUND_SOURCE === "image");
      background.classList.toggle("space-background--desktop-journey", Boolean(journey) && window.innerWidth >= 1024 && !motion.matches);
      background.classList.toggle("space-background--journey", enabled);
      background.toggleAttribute("data-atmosphere-paused", document.hidden);
      if (!enabled || !journey) {
        background.style.setProperty("--environment-blend", "0");
        return;
      }
      const hero = journey.panels.find(({ id }) => id === "hero");
      const departure = journey.panels.find(({ id }) => id === "toolkit");
      if (!hero || !departure) return;
      const blend = backgroundBlend(journey.x, hero.offset, departure.offset);
      const total = Math.max(1, (journey.panels.at(-1)?.offset ?? journey.width) - hero.offset);
      const progress = Math.max(0, Math.min(1, (journey.x - hero.offset) / total));
      background.style.setProperty("--environment-blend", String(blend));
      background.style.setProperty("--environment-x", `${-progress * journey.width * BACKGROUND_JOURNEY.parallaxFraction}px`);
      background.style.setProperty("--environment-far-x", `${-progress * journey.width * 0.006}px`);
      background.style.setProperty("--environment-near-x", `${-progress * journey.width * 0.012}px`);
      if (status !== "idle") return;
      status = "loading";
      background.dataset.nebulaState = status;
      image = new Image();
      image.decoding = "async";
      image.onload = async () => {
        try {
          await image!.decode();
          if (disposed) return;
          status = "ready";
          background.style.setProperty("--nebula-image", `url("${BACKGROUND_JOURNEY.nebulaUrl}")`);
          background.dataset.nebulaState = status;
        } catch {
          if (!disposed) { status = "error"; background.dataset.nebulaState = status; }
        }
      };
      image.onerror = () => {
        if (!disposed) { status = "error"; background.dataset.nebulaState = status; }
      };
      image.src = BACKGROUND_JOURNEY.nebulaUrl;
    };
    const unsubscribe = journeyRevealPosition.subscribe(sync);
    motion.addEventListener("change", sync);
    data.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      unsubscribe();
      motion.removeEventListener("change", sync);
      data.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      if (image) { image.onload = null; image.onerror = null; }
    };
  }, []);

  const handleFailure = () => setMode("fallback");
  return (
    <>
      {BACKGROUND_SOURCE === "image" && <link rel="preload" as="image" href="/backgrounds/planetary-sunrise-desktop.webp" media="(min-width: 1024px)" fetchPriority="high" />}
      <div ref={backgroundRef} className={`space-background space-background--fallback space-background--${BACKGROUND_SOURCE}`} aria-hidden="true">
        <div className="space-background__image" />
        <div className="space-background__nebula">
          <div className="space-background__nebula-ready"><div className="space-background__nebula-art" /></div>
        </div>
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
