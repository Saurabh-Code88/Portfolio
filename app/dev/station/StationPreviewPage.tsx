"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

const StationPreviewCanvas = dynamic(() => import("@/components/station/StationPreviewCanvas"), {
  ssr: false,
  loading: () => <div className="ship-preview__loading">Preparing station preview…</div>,
});

export default function StationPreviewPage() {
  const [bounds, setBounds] = useState<readonly [number, number, number] | null>(null);
  return (
    <main id="main-content" className="ship-preview-page" tabIndex={-1}>
      <header className="ship-preview__header">
        <div>
          <p className="ship-preview__eyebrow">Development reference</p>
          <h1>Station preview</h1>
          <p>Drag to orbit, scroll to zoom, and check the saucer axis, centring, and amber dock-point marker.</p>
        </div>
        <Link href="/">Return to portfolio</Link>
      </header>
      <section className="ship-preview__frame" aria-label="Interactive 3D station model preview">
        <StationPreviewCanvas onBounds={setBounds} />
      </section>
      <p className="station-preview__bounds">Loaded model bounds (X / Y / Z): {bounds ? bounds.map((value) => value.toFixed(2)).join(" / ") : "loading"}</p>
      <section className="ship-preview__facts" aria-labelledby="station-facts-heading">
        <h2 id="station-facts-heading">Model notes</h2>
        <ul>
          <li>Loaded bounds are X 0.85, Y 0.35, Z 1.19; the thin Y extent confirms the saucer lies flat with +Y up.</li>
          <li>No corrective rotation is needed; configured station rotation is zero.</li>
          <li>The model is centred from its loaded bounds and scaled to a 4.6-unit diameter.</li>
          <li>The amber marker shows DOCK_POINT just above the station top centre.</li>
          <li>Source and license: TO CONFIRM with the project owner.</li>
        </ul>
      </section>
    </main>
  );
}
