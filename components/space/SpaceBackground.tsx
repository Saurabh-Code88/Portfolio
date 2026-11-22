"use client";

import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { Component, type ReactNode, useEffect, useState } from "react";
import { BACKGROUND_SOURCE, ENABLE_3D_SHIP, LOW_POWER_CORE_THRESHOLD } from "@/lib/ship.config";

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
    document.body.classList.toggle("space-canvas-active", mode === "active");
    document.body.classList.add("space-background-present");
    return () => {
      document.body.classList.remove("space-canvas-active");
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

  const handleFailure = () => setMode("fallback");
  return (
    <div className={`space-background space-background--${mode} space-background--${BACKGROUND_SOURCE}`} aria-hidden="true">
      <div className="space-background__image" />
      <div className="space-background__stars space-background__stars--far" />
      <div className="space-background__stars space-background__stars--near" />
      <div className="space-background__vignette" />
      {mode === "active" && (
        <CanvasErrorBoundary onFailure={handleFailure}>
          <SpaceBackgroundCanvas scrollProgress={scrollYProgress} />
        </CanvasErrorBoundary>
      )}
    </div>
  );
}
