"use client";

import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useActiveSection } from "@/components/active-section-provider";
import { useEffect, useRef } from "react";
import { cockpitCopy, cockpitSections as sectionReadouts } from "@/content/cockpit";
import { journeyRevealPosition } from "@/lib/horizontalJourney";
import { flightProgressStore } from "@/lib/flightPath";
import { flightReadout, journeyCompletion } from "@/lib/cockpitTelemetry";
export function CockpitFrame() {
  const activeId = useActiveSection();
  const activeIndex = Math.max(0, sectionReadouts.findIndex(({ id }) => id === activeId));
  const { scrollYProgress } = useScroll();
  const displayProgress = useMotionValue(0);
  const markerPosition = useTransform(displayProgress, (value) => `${value * 100}%`);
  const telemetry = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const sync = () => {
      const journey = journeyRevealPosition.getSnapshot();
      const node = telemetry.current;
      if (!node) return;
      if (!journey) { node.textContent = ""; displayProgress.set(scrollYProgress.get()); return; }
      const first = journey.panels[0]?.offset ?? 0;
      const last = journey.panels.at(-1)?.offset ?? first;
      displayProgress.set(Math.max(0, Math.min(1, (journey.x - first) / Math.max(1, last - first))));
      const flight = flightProgressStore.getSnapshot();
      // Scroll rounding can leave the sampler fractions short of an exact stop.
      const atStop = journey.panels.some(({ offset }) => Math.abs(journey.x - offset) < 1);
      const status = flightReadout(flight.phase, flight.isParked || atStop, Math.abs(journey.x - first) < 1);
      const text = `${cockpitCopy[status]} · ${cockpitCopy.journey} ${journeyCompletion(journey.x, first, last)}%`;
      if (node.textContent !== text) node.textContent = text;
    };
    const stopJourney = journeyRevealPosition.subscribe(sync);
    const stopFlight = flightProgressStore.subscribe(sync);
    const stopScroll = scrollYProgress.on("change", (value) => {
      if (!journeyRevealPosition.getSnapshot()) displayProgress.set(value);
    });
    sync();
    return () => { stopJourney(); stopFlight(); stopScroll(); };
  }, [displayProgress, scrollYProgress]);

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
      <span className="cockpit-frame__section">{String(activeIndex + 1).padStart(2, "0")} / <span className="cockpit-frame__total">{String(sectionReadouts.length).padStart(2, "0")} · </span>{section.label.toUpperCase()}</span>
      <span className="cockpit-frame__telemetry" ref={telemetry} />
      <div className="cockpit-frame__progress-track">
        <motion.div className="cockpit-frame__progress" style={{ scaleX: displayProgress }} />
        <motion.span className="cockpit-frame__marker" style={{ left: markerPosition }} />
      </div>
    </aside>
  );
}
