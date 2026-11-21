"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ShipPreviewCanvas = dynamic(() => import("@/components/ship/ShipPreviewCanvas"), {
  ssr: false,
  loading: () => <div className="ship-preview__loading">Preparing ship preview…</div>,
});

export default function ShipPreviewPage() {
  return (
    <main id="main-content" className="ship-preview-page" tabIndex={-1}>
      <header className="ship-preview__header">
        <div>
          <p className="ship-preview__eyebrow">Development reference</p>
          <h1>Ship preview</h1>
          <p>Drag to orbit, scroll to zoom, and inspect the model orientation before tuning the flight path.</p>
        </div>
        <Link href="/">Return to portfolio</Link>
      </header>
      <section className="ship-preview__frame" aria-label="Interactive 3D ship model preview">
        <ShipPreviewCanvas />
      </section>
      <section className="ship-preview__facts" aria-labelledby="ship-facts-heading">
        <h2 id="ship-facts-heading">Model notes</h2>
        <ul>
          <li>About 40k triangles; one PBR material.</li>
          <li>Base-color, metalness, and roughness maps; no normal or emissive map.</li>
          <li>About 2 units long on the Z axis. Verify the nose direction and nozzle placement by eye.</li>
          <li>Engine glow is drawn with additive sprites, short thrust cones, and nozzle lights.</li>
        </ul>
      </section>
    </main>
  );
}
