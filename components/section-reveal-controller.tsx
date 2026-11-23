"use client";

import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useEffect } from "react";
import { easeInOutCubic, flightProgressStore, FLIGHT_SECTION_IDS } from "@/lib/flightPath";

const REVEAL_SELECTOR = ".section-heading, .toolkit-group, .project-card, .research-panel, .experience-entry, .education-column, .contact-links";

function revealTargets(sectionId: string) {
  const section = document.getElementById(sectionId);
  return section ? [...section.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)] : [];
}

export function SectionRevealController() {
  useEffect(() => {
    const playback = new Map<HTMLElement, AnimationPlaybackControls>();
    const revealed = new WeakSet<HTMLElement>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTarget: string | null = null;
    let previousPhase = "idle";
    let fallbackFrame = 0;

    const stop = (element: HTMLElement) => {
      playback.get(element)?.stop();
      playback.delete(element);
    };
    const reveal = (element: HTMLElement, index: number, spring: boolean) => {
      stop(element);
      const fromScale = reducedMotion.matches ? 1 : spring ? 0.82 : 0.97;
      element.style.opacity = "0";
      element.style.transformOrigin = "center";
      element.style.transform = fromScale === 1 ? "none" : `scale(${fromScale})`;
      const controls = animate(element, reducedMotion.matches ? { opacity: 1 } : { opacity: 1, scale: 1 }, spring && !reducedMotion.matches
        ? { type: "spring", stiffness: 110, damping: 16, delay: index * 0.09 }
        : { duration: reducedMotion.matches ? 0.18 : 0.38, delay: spring ? 0 : index * 0.09, ease: "easeOut" });
      playback.set(element, controls);
      revealed.add(element);
    };
    const restoreSection = (sectionId: string) => revealTargets(sectionId).forEach((element, index) => reveal(element, index, false));
    const hideSection = (sectionId: string) => revealTargets(sectionId).forEach((element) => {
      stop(element);
      element.style.transformOrigin = "center";
      element.style.transform = reducedMotion.matches ? "none" : "scale(.82)";
      element.style.opacity = "0";
      revealed.delete(element);
    });

    const onStoreUpdate = () => {
      const state = flightProgressStore.getSnapshot();
      const target = state.targetSectionId;
      const isTravelPhase = state.phase === "undock" || state.phase === "travel" || state.phase === "approach";
      if (isTravelPhase && target && target !== previousTarget) {
        if (previousTarget) restoreSection(previousTarget);
        if (target !== "hero") hideSection(target);
        previousTarget = target === "hero" ? null : target;
      }
      if (state.phase === "orbit" && target && previousPhase !== "orbit") {
        revealTargets(target).forEach((element, index) => reveal(element, index, true));
      }
      if (state.phase === "idle" && previousPhase !== "idle") {
        if (previousTarget) restoreSection(previousTarget);
        previousTarget = null;
        document.querySelectorAll<HTMLElement>("main > .content-section").forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            revealTargets(section.id).forEach((element, index) => {
              if (!revealed.has(element)) reveal(element, index, false);
            });
          }
        });
      }
      previousPhase = state.phase;
    };

    const observer = new IntersectionObserver((entries) => {
      if (flightProgressStore.getSnapshot().isFlying) return;
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        revealTargets((target as HTMLElement).id).forEach((element, index) => {
          if (!revealed.has(element)) reveal(element, index, false);
        });
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });
    FLIGHT_SECTION_IDS.filter((id) => id !== "hero").forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    const unsubscribe = flightProgressStore.subscribe(onStoreUpdate);

    const cancelFallbackScroll = () => {
      if (fallbackFrame) cancelAnimationFrame(fallbackFrame);
      fallbackFrame = 0;
    };
    const scrollToSection = (target: HTMLElement, duration: number) => {
      cancelFallbackScroll();
      const scrollMargin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const from = window.scrollY;
      const to = Math.max(0, target.getBoundingClientRect().top + from - scrollMargin);
      if (duration <= 0) {
        window.scrollTo({ top: to, behavior: "instant" });
        return;
      }
      const startedAt = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / duration);
        window.scrollTo({ top: from + (to - from) * easeInOutCubic(t), behavior: "instant" });
        if (t < 1) fallbackFrame = requestAnimationFrame(step);
        else fallbackFrame = 0;
      };
      fallbackFrame = requestAnimationFrame(step);
    };
    const fallbackClick = (event: MouseEvent) => {
      if (document.body.classList.contains("space-canvas-active")
        || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!element || element.target || element.hasAttribute("download")) return;
      const url = new URL(element.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      scrollToSection(target, reducedMotion.matches ? 0 : 420);
    };
    const fallbackFlight = (event: Event) => {
      if (document.body.classList.contains("space-canvas-active")) return;
      const sectionId = (event as CustomEvent<{ sectionId?: string }>).detail?.sectionId;
      const target = sectionId ? document.getElementById(sectionId) : null;
      if (target) scrollToSection(target, reducedMotion.matches ? 0 : 420);
    };
    const fallbackPopState = () => {
      if (document.body.classList.contains("space-canvas-active")) return;
      const sectionId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "hero";
      const target = document.getElementById(sectionId);
      if (target) scrollToSection(target, reducedMotion.matches ? 0 : 420);
    };
    document.addEventListener("click", fallbackClick, true);
    window.addEventListener("portfolio:flight-to", fallbackFlight);
    window.addEventListener("popstate", fallbackPopState);
    window.addEventListener("wheel", cancelFallbackScroll, { passive: true });
    window.addEventListener("touchstart", cancelFallbackScroll, { passive: true });
    return () => {
      unsubscribe();
      observer.disconnect();
      document.removeEventListener("click", fallbackClick, true);
      window.removeEventListener("portfolio:flight-to", fallbackFlight);
      window.removeEventListener("popstate", fallbackPopState);
      window.removeEventListener("wheel", cancelFallbackScroll);
      window.removeEventListener("touchstart", cancelFallbackScroll);
      cancelFallbackScroll();
      playback.forEach((controls) => controls.stop());
    };
  }, []);

  return null;
}
