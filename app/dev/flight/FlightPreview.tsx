"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FLIGHT_SECTION_IDS } from "@/lib/flightPath";
import { cinematicDiagnostics } from "@/lib/cinematicDiagnostics";
export default function FlightPreview() {
  const [speed, setSpeed] = useState(1);
  const [data, setData] = useState({ ...cinematicDiagnostics });
  useEffect(() => {
    const timer = setInterval(() => setData({ ...cinematicDiagnostics }), 200);
    return () => clearInterval(timer);
  }, []);
  const inspect = (value: number) => {
    const journey = document.querySelector<HTMLElement>(
      "[data-horizontal-journey='active']",
    );
    if (!journey) return;
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 0 }));
    window.scrollTo({
      top:
        Number(journey.dataset.scrollStart) +
        Number(journey.dataset.verticalDistance) * value,
      behavior: "instant",
    });
  };
  return (
    <aside
      className="flight-preview-controls"
      aria-label="Cinematic diagnostics"
    >
      <header>
        <h1>Cinematic timeline</h1>
        <Link href="/">Open portfolio</Link>
      </header>
      <label>
        Inspect journey {(data.progress * 100).toFixed(1)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={data.progress}
          onChange={(e) => inspect(Number(e.target.value))}
        />
      </label>
      <label>
        Navigation speed {speed.toFixed(1)}
        <input
          type="range"
          min="0.4"
          max="2"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
      <div className="ship-preview__actions">
        {FLIGHT_SECTION_IDS.map((sectionId) => (
          <button
            key={sectionId}
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("portfolio:flight-to", {
                  detail: { sectionId, speed },
                }),
              )
            }
          >
            Fly to {sectionId}
          </button>
        ))}
      </div>
      <label>
        Inspect axial angle
        <input
          type="range"
          min="0"
          max="6.283185"
          step="0.01"
          defaultValue="0"
          onChange={(e) => {
            cinematicDiagnostics.inspectIdleAngle = Number(e.target.value);
          }}
        />
      </label>
      <button
        onClick={() => {
          cinematicDiagnostics.inspectIdleAngle = null;
        }}
      >
        Resume idle rotation
      </button>
      <button
        onClick={() => {
          cinematicDiagnostics.lightingEnabled =
            !cinematicDiagnostics.lightingEnabled;
        }}
      >
        Toggle ship lighting
      </button>
      <output
        aria-live="off"
        data-x={data.x}
        data-y={data.y}
        data-z={data.z}
        data-idle-angle={data.idleAngle}
        data-idle-weight={data.idleWeight}
        data-fps={data.fps}
        data-draw-calls={data.drawCalls}
        data-triangles={data.triangles}
        data-profile={data.flightProfile}
        data-size={data.projectedSize}
        data-progress={data.progress}
        data-station={data.stationVisible}
        data-destination={data.destination}
      >
        <p>
          Last-pass calls {data.drawCalls} / triangles {data.triangles}
        </p>
        <p>
          Resting anchor {data.restingAnchor} / profile {data.flightProfile}
        </p>
        <p>Base quaternion {data.baseQuaternion}</p>
        <p>
          Idle angle {data.idleAngle.toFixed(3)} / blend{" "}
          {data.idleWeight.toFixed(2)}
        </p>
        <p>Projected hull estimate {data.projectedSize.toFixed(1)}px</p>
        <p>
          Video target {data.targetTime.toFixed(3)}s / decoded{" "}
          {data.decodedTime.toFixed(3)}s
        </p>
        <p>
          Lag {data.seekLag.toFixed(3)}s / seek {data.seekMs.toFixed(1)}ms ?{" "}
          {data.decodedBy}
        </p>
        <p>
          Seeks {data.seeks} / coalesced {data.coalesced}
        </p>
        <p>
          Ship X {data.x.toFixed(2)} / Y {data.y.toFixed(2)} / Z{" "}
          {data.z.toFixed(2)}
        </p>
        <p>
          Camera distance {data.cameraDistance.toFixed(2)} / FPS estimate{" "}
          {data.fps.toFixed(1)}
        </p>
        <p>
          {data.destination} / {data.phase} / station{" "}
          {data.stationVisible ? "visible" : "departed"}
        </p>
      </output>
    </aside>
  );
}
