"use client";

import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { Component, type ReactNode, useEffect, useState } from "react";
import { BACKGROUND_SOURCE, ENABLE_3D_SHIP } from "@/lib/ship.config";

const SpaceBackgroundCanvas = dynamic(() => import("@/components/space/SpaceBackgroundCanvas"), {
  ssr: false,
  loading: () => null,
});

type DisplayMode = "disabled" | "fallback" | "active";

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
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return Boolean(context);
}

export function SpaceBackground() {
  const [mode, setMode] = useState<DisplayMode>(ENABLE_3D_SHIP ? "fallback" : "disabled");
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    if (!ENABLE_3D_SHIP) {
      setMode("disabled");
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMode = () => {
      const limitedHardware = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
      const canAnimate = !reducedMotion.matches && window.innerWidth >= 768 && !limitedHardware && supportsWebGL();
      setMode(canAnimate ? "active" : "fallback");
    };
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
    document.body.classList.toggle("space-background-present", mode !== "disabled");
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
  if (mode === "disabled") return null;
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
