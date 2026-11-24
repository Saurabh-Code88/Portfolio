"use client";

import Link from "next/link";
import { useState } from "react";
import { FLIGHT_SECTION_IDS } from "@/lib/flightPath";

export default function FlightPreview() {
  const [speed, setSpeed] = useState(1);
  const launch = (sectionId: string) => {
    window.dispatchEvent(new CustomEvent("portfolio:flight-to", { detail: { sectionId, speed } }));
  };

  return (
    <aside className="flight-preview-controls" aria-label="Flight controls">
      <header>
        <p className="ship-preview__eyebrow">Development reference</p>
        <h1>Flight timing</h1>
        <Link href="/">Open portfolio</Link>
      </header>
        <label className="ship-preview__control">
          Flight speed: {speed.toFixed(1)}×
          <input type="range" min="0.4" max="2" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="ship-preview__actions">
          {FLIGHT_SECTION_IDS.map((sectionId) => (
            <button className="hero-action hero-action--secondary" key={sectionId} onClick={() => launch(sectionId)} type="button">
              Fly to {sectionId}
            </button>
          ))}
        </div>
    </aside>
  );
}
