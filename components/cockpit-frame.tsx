"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

const sectionReadouts = [
  { id: "hero", label: "ABOUT" },
  { id: "toolkit", label: "TOOLKIT" },
  { id: "projects", label: "PROJECTS" },
  { id: "research", label: "RESEARCH" },
  { id: "experience", label: "ABOUT" },
  { id: "contact", label: "CONTACT" },
] as const;

export function CockpitFrame() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll();
  const markerPosition = useTransform(scrollYProgress, (value) => `${value * 100}%`);

  useEffect(() => {
    const sections = sectionReadouts
      .map(({ id }) => id === "hero" ? document.querySelector<HTMLElement>("[data-flight-section='hero']") : document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const positions = new Map<HTMLElement, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) positions.set(entry.target as HTMLElement, entry.boundingClientRect.top);
        else positions.delete(entry.target as HTMLElement);
      }
      const active = [...positions.entries()].sort(
        (a, b) => Math.abs(a[1] - window.innerHeight * 0.28) - Math.abs(b[1] - window.innerHeight * 0.28),
      )[0]?.[0];
      if (!active) return;
      const sectionId = active.id || "hero";
      const index = sectionReadouts.findIndex(({ id }) => id === sectionId);
      if (index >= 0) setActiveIndex(index);
    }, { rootMargin: "-18% 0px -70% 0px", threshold: 0 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const section = sectionReadouts[activeIndex];

  return (
    <aside className="cockpit-frame" aria-hidden="true">
      <svg className="cockpit-frame__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path className="cockpit-frame__outline" d="M34 10H966L990 34V966L966 990H34L10 966V34Z" />
        <path className="cockpit-frame__ornaments" d="M10 88V45L45 10M10 76H27M10 64H22M28 10H72M956 10L990 44V88M990 76H973M990 64H978M972 10H928M10 912V956L44 990M10 924H27M10 936H22M28 990H72M956 990L990 956V912M990 924H973M990 936H978M972 990H928" />
        <rect className="cockpit-frame__corner" x="31" y="31" width="5" height="5" />
        <rect className="cockpit-frame__corner" x="964" y="31" width="5" height="5" />
        <rect className="cockpit-frame__corner" x="31" y="964" width="5" height="5" />
        <rect className="cockpit-frame__corner" x="964" y="964" width="5" height="5" />
      </svg>
      <span className="cockpit-frame__section">{String(activeIndex + 1).padStart(2, "0")} / {section.label}</span>
      <div className="cockpit-frame__progress-track">
        <motion.div className="cockpit-frame__progress" style={{ scaleX: scrollYProgress }} />
        <motion.span className="cockpit-frame__marker" style={{ left: markerPosition }} />
      </div>
    </aside>
  );
}
