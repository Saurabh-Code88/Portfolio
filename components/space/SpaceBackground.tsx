"use client";

import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { BACKGROUND_SOURCE, ENABLE_3D_SHIP, LOW_POWER_CORE_THRESHOLD } from "@/lib/ship.config";
import { flightProgressStore } from "@/lib/flightPath";
import { journeyRevealPosition } from "@/lib/horizontalJourney";
import { ENVIRONMENTS, environmentComposition, canUseBackgroundJourney } from "@/lib/backgroundJourney";

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
    const images: HTMLImageElement[] = [];
    const ready = ENVIRONMENTS.map(() => false);
    const requested = new Set<number>();
    let disposed = false;
    const layers = Array.from(background.querySelectorAll<HTMLElement>("[data-environment]"));
    const load = (index: number) => {
      if (index < 0 || index >= ENVIRONMENTS.length || requested.has(index)) return;
      requested.add(index);
      const image = new Image();
      images.push(image);
      image.decoding = "async";
      image.onload = async () => {
        try {
          await image.decode();
          if (disposed) return;
          layers[index].style.backgroundImage = `url("${image.src}")`;
          ready[index] = true;
          sync();
        } catch { /* Persistent Home artwork remains below the decoded layers. */ }
      };
      image.onerror = () => { layers[index].dataset.load = "error"; };
      image.src = `/backgrounds/${ENVIRONMENTS[index].asset}.webp`;
    };
    const sync = () => {
      if (disposed) return;
      const journey = journeyRevealPosition.getSnapshot();
      const enabled = canUseBackgroundJourney(Boolean(journey), window.innerWidth, motion.matches,
        data.matches || Boolean(connection?.saveData), lowPower, BACKGROUND_SOURCE === "image");
      background.classList.toggle("space-background--desktop-journey", Boolean(journey) && window.innerWidth >= 1024 && !motion.matches);
      background.classList.toggle("space-background--journey", enabled);
      background.toggleAttribute("data-atmosphere-paused", document.hidden);
      if (!enabled || !journey) return;
      const current = Math.max(0, journey.panels.findLastIndex(p => p.offset <= journey.x));
      const target = ENVIRONMENTS.findIndex(e => e.sectionId === flightProgressStore.getSnapshot().targetSectionId);
      // Destination first on distant HUD flights; then neighbors of the visible region.
      if (target >= 0) { load(target); load(target - 1); load(target + 1); }
      load(current); load(current + 1); load(current - 1);
      const weights = environmentComposition(journey.x, journey.panels, ready);
      let remaining = 1;
      for (let i = layers.length - 1; i >= 0; i--) {
        layers[i].style.opacity = String(remaining > 0 ? weights[i] / remaining : 0);
        remaining = Math.max(0, remaining - weights[i]);
        const env = ENVIRONMENTS[i];
        const distance = (journey.panels[i]?.offset ?? 0) - journey.x;
        const shift = Math.max(-1, Math.min(1, distance / journey.width)) * journey.width * (env.travelDistance + env.parallax);
        layers[i].style.setProperty("--region-x", `${shift}px`);
      }
      const contrast = weights.reduce((sum, w, i) => sum + w * ENVIRONMENTS[i].contrast, 0);
      background.style.setProperty("--region-contrast", String(contrast));
      background.style.setProperty("--environment-blend", "1");
      background.style.setProperty("--environment-far-x", `${-journey.x * .006}px`);
      background.style.setProperty("--environment-near-x", `${-journey.x * .025}px`);
    };
    const unsubscribe = journeyRevealPosition.subscribe(sync);
    const unsubscribeFlight = flightProgressStore.subscribe(sync);
    motion.addEventListener("change", sync);
    data.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      unsubscribe();
      unsubscribeFlight();
      motion.removeEventListener("change", sync);
      data.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      images.forEach(image => { image.onload = null; image.onerror = null; });
    };
  }, []);

  const handleFailure = () => setMode("fallback");
  return (
    <>
      {BACKGROUND_SOURCE === "image" && <link rel="preload" as="image" href="/backgrounds/planetary-sunrise.webp" media="(min-width: 1024px)" fetchPriority="high" />}
      <div ref={backgroundRef} className={`space-background space-background--fallback space-background--${BACKGROUND_SOURCE}`} aria-hidden="true">
        <div className="space-background__image" />
        <div className="space-background__regions">
          {ENVIRONMENTS.map(env => <div key={env.sectionId} data-environment={env.sectionId}
            className="space-background__region" style={{ backgroundPosition: env.focalPoint,
              "--drift": `${env.drift}%` } as React.CSSProperties} />)}
        </div>
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
