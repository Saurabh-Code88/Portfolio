"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  STATION_ANTENNA_GLOW_OFFSETS,
  STATION_BREAKPOINT_OVERRIDES,
  STATION_RIM_GLOW_COUNT,
  STATION_RIM_GLOW_HEIGHT,
  STATION_RIM_GLOW_RADIUS,
  STATION_SCALE,
  type StationBreakpointName,
} from "@/lib/station.config";

function presetTransform(preset: StationBreakpointName) {
  const values = STATION_BREAKPOINT_OVERRIDES[preset];
  return { scale: STATION_SCALE * values.scale, position: [...values.position] as [number, number, number], rotation: [...values.rotation] as [number, number, number] };
}

const StationPreviewCanvas = dynamic(() => import("@/components/station/StationPreviewCanvas"), {
  ssr: false,
  loading: () => <div className="ship-preview__loading">Preparing station preview…</div>,
});

export default function StationPreviewPage() {
  const [bounds, setBounds] = useState<readonly [number, number, number] | null>(null);
  const [preset, setPreset] = useState<StationBreakpointName>("desktop");
  const [transform, setTransform] = useState(() => presetTransform("desktop"));
  const [glowTuning, setGlowTuning] = useState(() => ({
    antennaOffset: [...STATION_ANTENNA_GLOW_OFFSETS[0]] as [number, number, number],
    rimRadius: STATION_RIM_GLOW_RADIUS,
    rimHeight: STATION_RIM_GLOW_HEIGHT,
    rimCount: STATION_RIM_GLOW_COUNT,
  }));
  const setPosition = (index: number, value: number) => setTransform((current) => {
    const position: [number, number, number] = [...current.position];
    position[index] = value;
    return { ...current, position };
  });
  const setRotation = (index: number, degrees: number) => setTransform((current) => {
    const rotation: [number, number, number] = [...current.rotation];
    rotation[index] = degrees * Math.PI / 180;
    return { ...current, rotation };
  });
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
        <StationPreviewCanvas transform={transform} glowTuning={glowTuning} onBounds={setBounds} />
      </section>
      <p className="station-preview__bounds">Loaded model bounds (X / Y / Z): {bounds ? bounds.map((value) => value.toFixed(2)).join(" / ") : "loading"}</p>
      <section className="station-preview__controls" aria-label="Station tuning controls">
        <div className="station-preview__presets" role="group" aria-label="Breakpoint preset">
          {(["desktop", "tablet"] as const).map((name) => (
            <button key={name} type="button" aria-pressed={preset === name} onClick={() => { setPreset(name); setTransform(presetTransform(name)); }}>
              {name === "desktop" ? "Desktop" : "Tablet"} preset
            </button>
          ))}
        </div>
        <label className="station-preview__slider">
          <span>Scale <output>{transform.scale.toFixed(2)}</output></span>
          <input type="range" min="0.5" max="1.5" step="0.01" value={transform.scale} onChange={(event) => setTransform((current) => ({ ...current, scale: Number(event.target.value) }))} />
        </label>
        {(["X · frustum width", "Y · frustum height", "Z · depth"] as const).map((label, index) => (
          <label className="station-preview__slider" key={label}>
            <span>Position {label} <output>{transform.position[index].toFixed(2)}</output></span>
            <input type="range" min={index === 0 ? "0.20" : index === 1 ? "-0.4" : "-2"} max={index === 0 ? "0.34" : index === 1 ? "0.2" : "2"} step={index === 0 ? "0.002" : "0.01"} value={transform.position[index]} onChange={(event) => setPosition(index, Number(event.target.value))} />
          </label>
        ))}
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <label className="station-preview__slider" key={axis}>
            <span>Rotation {axis} <output>{Math.round(transform.rotation[index] * 180 / Math.PI)}°</output></span>
            <input type="range" min="-180" max="180" step="1" value={transform.rotation[index] * 180 / Math.PI} onChange={(event) => setRotation(index, Number(event.target.value))} />
          </label>
        ))}
        <h2>Red glow positions</h2>
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <label className="station-preview__slider" key={`antenna-${axis}`}>
            <span>Antenna {axis} <output>{glowTuning.antennaOffset[index].toFixed(2)}</output></span>
            <input type="range" min={index === 1 ? "0.1" : "-1.5"} max={index === 1 ? "1.2" : "1.5"} step="0.01" value={glowTuning.antennaOffset[index]} onChange={(event) => setGlowTuning((current) => {
              const antennaOffset: [number, number, number] = [...current.antennaOffset];
              antennaOffset[index] = Number(event.target.value);
              return { ...current, antennaOffset };
            })} />
          </label>
        ))}
        <label className="station-preview__slider">
          <span>Rim radius <output>{glowTuning.rimRadius.toFixed(2)}</output></span>
          <input type="range" min="1.6" max="2.5" step="0.01" value={glowTuning.rimRadius} onChange={(event) => setGlowTuning((current) => ({ ...current, rimRadius: Number(event.target.value) }))} />
        </label>
        <label className="station-preview__slider">
          <span>Rim height <output>{glowTuning.rimHeight.toFixed(2)}</output></span>
          <input type="range" min="-0.4" max="0.5" step="0.01" value={glowTuning.rimHeight} onChange={(event) => setGlowTuning((current) => ({ ...current, rimHeight: Number(event.target.value) }))} />
        </label>
        <label className="station-preview__slider">
          <span>Rim emitters <output>{glowTuning.rimCount}</output></span>
          <input type="range" min="4" max="32" step="1" value={glowTuning.rimCount} onChange={(event) => setGlowTuning((current) => ({ ...current, rimCount: Number(event.target.value) }))} />
        </label>
      </section>
      <section className="ship-preview__facts" aria-labelledby="station-facts-heading">
        <h2 id="station-facts-heading">Model notes</h2>
        <ul>
          <li>The preview starts with the selected desktop or tablet override; sliders adjust the model live.</li>
          <li>Loaded bounds X 0.85, Y 0.35, Z 1.19 confirm +Y up and a flat saucer; no correction rotation is needed.</li>
          <li>The model is centred from its loaded bounds and scaled to a 4.6-unit diameter.</li>
          <li>The amber marker shows DOCK_POINT just above the station top centre.</li>
          <li>Source and license: TO CONFIRM with the project owner.</li>
        </ul>
      </section>
    </main>
  );
}
