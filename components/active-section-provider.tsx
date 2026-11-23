"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { selectActiveSection } from "@/lib/activeSection";
import { getHorizontalJourneyReadingPosition } from "@/lib/horizontalJourney";

const ActiveSectionContext = createContext<string | null>(null);

export const useActiveSection = () => useContext(ActiveSectionContext);

/** One read-only measurement source for both navigation and cockpit readouts. */
export function ActiveSectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState<{ pathname: string; id: string } | null>(null);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let frame = 0;
    let previousId: string | null = null;
    let previousGeometry = "";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      frame = 0;
      const sections = [...main.querySelectorAll<HTMLElement>("[data-flight-section='hero'], .content-section[id]")];
      if (!sections.length) return;
      const horizontal = getHorizontalJourneyReadingPosition(sections);
      const starts = horizontal?.starts ?? sections.map((section) => section.getBoundingClientRect().top + window.scrollY);
      const position = horizontal?.position ?? window.scrollY + window.innerHeight * 0.28;
      const geometry = `${horizontal ? "horizontal" : "vertical"}:${window.innerWidth}:${window.innerHeight}:${starts.join(",")}`;
      const ids = sections.map((section) => section.dataset.flightSection || section.id);
      const previous = geometry === previousGeometry && previousId ? ids.indexOf(previousId) : -1;
      const atBottom = !horizontal && window.scrollY > 0
        && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const index = atBottom ? sections.length - 1 : selectActiveSection(starts, position, previous);
      previousGeometry = geometry;
      const id = ids[index];
      if (id !== previousId) {
        previousId = id;
        setActive({ pathname, id });
      }
    };
    // Coalesce reads after layout/scroll events; this never drives an animation.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(schedule);
    const observeSections = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(main);
      main.querySelectorAll("[data-journey-panel], [data-flight-section='hero'], .content-section[id]")
        .forEach((section) => resizeObserver.observe(section));
    };
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) observeSections();
      schedule();
    });
    mutationObserver.observe(main, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["open", "data-horizontal-journey", "data-scroll-start", "data-horizontal-distance", "data-vertical-distance"],
    });
    observeSections();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    media.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [pathname]);

  return <ActiveSectionContext.Provider value={active?.pathname === pathname ? active.id : null}>{children}</ActiveSectionContext.Provider>;
}
