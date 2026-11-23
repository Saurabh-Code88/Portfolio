"use client";

import { Children, useLayoutEffect, useRef } from "react";
import { journeyRevealPosition, type JourneyRevealPosition } from "@/lib/horizontalJourney";

/** A native vertical scroll region that translates the existing sections horizontally. */
export function HorizontalJourney({ children }: { children: React.ReactNode }) {
  const regionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const region = regionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!region || !viewport || !track) return;

    const panels = [...track.querySelectorAll<HTMLElement>("[data-journey-panel]")];
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let horizontal = false;
    let frame = 0;
    let initialPositionHandled = false;
    let revealGeometry: JourneyRevealPosition | null = null;

    const syncTrack = () => {
      frame = 0;
      if (!horizontal) return;
      const start = Number(region.dataset.scrollStart || 0);
      const verticalDistance = Number(region.dataset.verticalDistance || 1);
      const horizontalDistance = Number(region.dataset.horizontalDistance || 0);
      const progress = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, verticalDistance)));
      track.style.transform = `translate3d(${-horizontalDistance * progress}px, 0, 0)`;
      if (revealGeometry) {
        revealGeometry.x = horizontalDistance * progress;
        journeyRevealPosition.publish(revealGeometry);
      }
    };
    const requestSync = () => {
      if (!frame) frame = requestAnimationFrame(syncTrack);
    };

    const measure = () => {
      const width = viewport.clientWidth || window.innerWidth;
      const height = viewport.clientHeight || window.innerHeight;
      const nav = document.querySelector<HTMLElement>(".site-nav");
      const scrollableContent = panels.flatMap((panel) => [...panel.querySelectorAll<HTMLElement>(".hero-page, .content-section")]);
      const contentFits = panels.every((panel) => panel.scrollHeight <= height - 24)
        && scrollableContent.every((content) => content.scrollHeight <= height - 24);
      const navFits = !nav || nav.scrollWidth <= nav.clientWidth + 1;
      // The desktop breakpoint uses viewport width; a scrollbar must not turn a
      // 1024px desktop into the content-fit tablet branch and oscillate layouts.
      horizontal = !media.matches && (window.innerWidth >= 1024 || (width >= 768 && contentFits && navFits));
      if (horizontal) region.style.setProperty("--journey-panel-width", `${width}px`);
      else region.style.removeProperty("--journey-panel-width");
      region.classList.toggle("horizontal-journey--active", horizontal);

      if (!horizontal) {
        revealGeometry = null;
        journeyRevealPosition.publish(null);
        delete region.dataset.horizontalJourney;
        delete region.dataset.scrollStart;
        delete region.dataset.horizontalDistance;
        delete region.dataset.verticalDistance;
        region.style.height = "";
        track.style.transform = "";
        return;
      }

      const horizontalDistance = Math.max(0, track.scrollWidth - width);
      const tallestPanel = Math.max(height, ...panels.map((panel) => panel.scrollHeight), ...scrollableContent.map((content) => content.scrollHeight));
      const verticalDistance = horizontalDistance + Math.max(0, tallestPanel - height);
      const start = region.getBoundingClientRect().top + window.scrollY;
      region.dataset.horizontalJourney = "active";
      region.dataset.scrollStart = String(start);
      region.dataset.horizontalDistance = String(horizontalDistance);
      region.dataset.verticalDistance = String(verticalDistance);
      region.style.height = `${height + verticalDistance}px`;
      revealGeometry = window.innerWidth >= 1024 ? {
        x: 0, width,
        panels: panels.map((panel) => ({
          id: panel.querySelector<HTMLElement>("section[id]")?.id ?? "", offset: panel.offsetLeft,
        })),
      } : null;
      if (!revealGeometry) journeyRevealPosition.publish(null);
      if (!initialPositionHandled) {
        initialPositionHandled = true;
        const sectionId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
        const section = sectionId ? document.getElementById(sectionId) : null;
        const panel = section?.closest<HTMLElement>("[data-journey-panel]");
        if (panel && horizontalDistance > 0) {
          const targetScroll = sectionId === "hero" ? 0 : start + Math.max(0, Math.min(1, panel.offsetLeft / horizontalDistance)) * verticalDistance;
          requestAnimationFrame(() => window.scrollTo({ top: targetScroll, behavior: "instant" }));
        }
      }
      requestSync();
    };

    const onScroll = () => requestSync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    media.addEventListener("change", measure);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resizeObserver?.observe(track);
    panels.forEach((panel) => resizeObserver?.observe(panel));
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(measure);
    mutationObserver?.observe(track, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["open"] });
    measure();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      media.removeEventListener("change", measure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      journeyRevealPosition.publish(null);
      region.classList.remove("horizontal-journey--active");
      region.style.height = "";
    };
  }, []);

  return (
    <div className="horizontal-journey" ref={regionRef}>
      <div className="horizontal-journey__viewport" ref={viewportRef}>
        <div className="horizontal-journey__track" ref={trackRef}>
          {Children.toArray(children).map((child, index) => (
            <div className="horizontal-journey__panel" data-journey-panel={index} key={index}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
