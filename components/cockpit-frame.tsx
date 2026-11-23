"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useActiveSection } from "@/components/active-section-provider";

const sectionReadouts = [
  { id: "hero", label: "ABOUT" },
  { id: "toolkit", label: "TOOLKIT" },
  { id: "projects", label: "PROJECTS" },
  { id: "research", label: "RESEARCH" },
  { id: "experience", label: "ABOUT" },
  { id: "contact", label: "CONTACT" },
] as const;

export function CockpitFrame() {
  const activeId = useActiveSection();
  const activeIndex = Math.max(0, sectionReadouts.findIndex(({ id }) => id === activeId));
  const { scrollYProgress } = useScroll();
  const markerPosition = useTransform(scrollYProgress, (value) => `${value * 100}%`);

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
