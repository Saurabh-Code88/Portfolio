"use client";

import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useEffect } from "react";
import { easeInOutCubic, flightProgressStore, FLIGHT_SECTION_IDS } from "@/lib/flightPath";
import { getHorizontalJourneyScrollTarget, journeyRevealPosition } from "@/lib/horizontalJourney";
import { sectionArrivalProgress, sectionRevealStyle } from "@/lib/sectionReveal";
import { fluidRevealStyle } from "@/lib/journeyMotion";

const REVEAL_SELECTOR = ".section-heading, .toolkit-group, .project-card, .chapter-project-links, .research-panel, .experience-entry, .education-column, .contact-links";

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

    const sections = FLIGHT_SECTION_IDS.filter((id) => id !== "hero").map((id) => ({
      id, element: document.getElementById(id), targets: revealTargets(id), complete: false, lastProgress: -1, floor: 0,
    }));
    const layouts = new Map<HTMLElement, { left: number; top: number }>();
    let lastTailX = -1, lastTailY = -1;
    let lastNavigationTarget: string | null = null;
    let wasFluid = false;
    let layoutTimer: ReturnType<typeof setTimeout> | undefined;
    const measureLayouts = () => {
      const track = document.querySelector<HTMLElement>(".horizontal-journey__track");
      if (!track) return;
      const targets = sections.flatMap(({ targets }) => targets);
      targets.forEach((element) => {
        let left = 0, top = 0;
        let node: HTMLElement | null = element;
        while (node && node !== track) {
          left += node.offsetLeft;
          top += node.offsetTop;
          const parent = node.offsetParent as HTMLElement | null;
          if (parent && parent !== track) { left += parent.clientLeft; top += parent.clientTop; }
          node = parent;
        }
        layouts.set(element, { left, top });
      });
    };
    let desktop = false;
    const restoreDesktop = () => {
      sections.forEach(({ targets, element: section }) => {
        section?.classList.remove("section-reveal--unfolding");
        section?.style.removeProperty("--section-arrival");
        targets.forEach((element) => {
          stop(element);
          element.style.opacity = "1";
          element.style.transform = "none";
          element.style.transformOrigin = "";
          element.style.pointerEvents = "";
          element.style.willChange = "";
          revealed.add(element);
        });
      });
    };
    const syncDesktop = () => {
      const geometry = journeyRevealPosition.getSnapshot();
      const enabled = Boolean(geometry) && !reducedMotion.matches;
      if (!enabled || !geometry) {
        if (desktop) restoreDesktop();
        desktop = false;
        return;
      }
      if (!desktop) {
        sections.forEach((section) => {
          if (section.targets.length && section.targets.every((element) => revealed.has(element))) section.complete = true;
          section.lastProgress = -1;
          section.targets.forEach(stop);
        });
        previousTarget = null;
        previousPhase = "idle";
        desktop = true;
        measureLayouts();
      }
      const flight = flightProgressStore.getSnapshot();
      const fluid = document.body.classList.contains("space-canvas-active");
      if (wasFluid && !fluid) {
        restoreDesktop();
        sections.forEach((section) => { section.complete = true; });
      }
      wasFluid = fluid;
      const tailX = flight.tailX ?? geometry.width * .9;
      const tailY = flight.tailY ?? window.innerHeight * .6;
      const anchorChanged = Math.abs(tailX - lastTailX) >= .5 || Math.abs(tailY - lastTailY) >= .5;
      lastTailX = tailX; lastTailY = tailY;
      if (flight.isFlying && flight.targetSectionId !== lastNavigationTarget) {
        sections.forEach((section) => { section.floor = Math.max(section.floor, section.lastProgress, 0); });
      }
      lastNavigationTarget = flight.isFlying ? flight.targetSectionId : null;
      for (const section of sections) {
        const panel = geometry.panels.find(({ id }) => id === section.id);
        if (!panel) continue;
        let progress = sectionArrivalProgress(geometry.x, panel.offset, geometry.width);
        if (fluid) progress = flight.revealSectionId === section.id ? flight.revealProgress ?? 0 : 0;
        else if (flight.targetSectionId === section.id && ["orbit", "settle"].includes(flight.phase)) progress = 1;
        progress = Math.max(progress, section.floor);
        if (progress >= 1 || section.element?.contains(document.activeElement)) section.complete = true;
        if (section.complete) progress = 1;
        section.element?.classList.toggle("section-reveal--unfolding", fluid && !section.complete);
        if (fluid) section.element?.style.setProperty("--section-arrival", String(progress));
        if (section.lastProgress === progress && (!fluid || !anchorChanged || progress === 1 || progress === 0)) continue;
        section.lastProgress = progress;
        section.targets.forEach((element, index) => {
          if (fluid) {
            const value = fluidRevealStyle(progress, index);
            const layout = layouts.get(element);
            element.style.transformOrigin = layout ? `${tailX - (layout.left - geometry.x)}px ${tailY - layout.top}px` : "right center";
            element.style.opacity = String(value.opacity);
            element.style.transform = progress === 1 ? "none" : `scale(${value.x}, ${value.y}) skewY(${value.skew}deg)`;
            element.style.pointerEvents = progress < .95 ? "none" : "";
            element.style.willChange = progress > 0 && progress < 1 ? "transform, opacity" : "";
            return;
          }
          const value = sectionRevealStyle(progress, index, element.classList.contains("section-heading"));
          element.style.transformOrigin = "center";
          element.style.opacity = String(value.opacity);
          element.style.transform = `translateY(${value.y}px) scale(${value.scale})`;
        });
      }
    };

    const onStoreUpdate = () => {
      if (journeyRevealPosition.getSnapshot() && !reducedMotion.matches) { syncDesktop(); return; }
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
        document.querySelectorAll<HTMLElement>("main .content-section").forEach((section) => {
          const rect = section.getBoundingClientRect();
          const horizontalVisible = rect.right > 0 && rect.left < window.innerWidth;
          if (horizontalVisible && rect.bottom > 0 && rect.top < window.innerHeight) {
            revealTargets(section.id).forEach((element, index) => {
              if (!revealed.has(element)) reveal(element, index, false);
            });
          }
        });
      }
      previousPhase = state.phase;
    };

    const observer = new IntersectionObserver((entries) => {
      if (journeyRevealPosition.getSnapshot() && !reducedMotion.matches) return;
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
    const unsubscribeJourney = journeyRevealPosition.subscribe(syncDesktop);
    const layoutObserver = new ResizeObserver(() => {
      if (!desktop) return;
      clearTimeout(layoutTimer);
      layoutTimer = setTimeout(() => {
        measureLayouts();
        sections.forEach((section) => { section.lastProgress = -1; });
        syncDesktop();
      }, 0);
    });
    sections.forEach(({ element, targets }) => {
      if (element) layoutObserver.observe(element);
      targets.forEach((target) => layoutObserver.observe(target));
    });
    const onFocus = (event: FocusEvent) => {
      if (!desktop) return;
      const target = event.target;
      sections.forEach((section) => {
        if (target instanceof Node && section.element?.contains(target)) {
          section.complete = true;
          section.lastProgress = -1;
        }
      });
      syncDesktop();
    };
    document.addEventListener("focusin", onFocus, true);
    reducedMotion.addEventListener("change", syncDesktop);
    syncDesktop();

    const cancelFallbackScroll = () => {
      if (fallbackFrame) cancelAnimationFrame(fallbackFrame);
      fallbackFrame = 0;
    };
    const scrollToSection = (target: HTMLElement, duration: number) => {
      cancelFallbackScroll();
      const scrollMargin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const from = window.scrollY;
      const horizontalTarget = getHorizontalJourneyScrollTarget(target);
      const to = Math.max(0, horizontalTarget ?? target.getBoundingClientRect().top + from - scrollMargin);
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
      const detail = (event as CustomEvent<{ sectionId?: string; instant?: boolean }>).detail;
      const sectionId = detail?.sectionId;
      const target = sectionId ? document.getElementById(sectionId) : null;
      if (target) { scrollToSection(target, reducedMotion.matches || detail?.instant ? 0 : 420); if(detail?.instant) window.dispatchEvent(new Event("portfolio:journey-snap")); }
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
      unsubscribeJourney();
      layoutObserver.disconnect();
      clearTimeout(layoutTimer);
      document.removeEventListener("focusin", onFocus, true);
      reducedMotion.removeEventListener("change", syncDesktop);
      if (desktop) restoreDesktop();
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
