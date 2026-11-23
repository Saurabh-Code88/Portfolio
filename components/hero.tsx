"use client";

import { profile, profileContactLinks } from "@/content/profile";
import { heroCopy, heroProofPoints, heroStations } from "@/content/hero";
import { HudFrame } from "@/components/hud-frame";
import { useEffect, useRef } from "react";

export function Hero() {
  const resumeLink = profileContactLinks.find(({ download }) => download);
  const panelRef = useRef<HTMLDivElement>(null);
  const stationSplit = Math.floor(heroStations.length / 2);
  const stationGroups = [
    { side: "left" as const, stations: heroStations.slice(0, stationSplit), startIndex: 0 },
    { side: "right" as const, stations: heroStations.slice(stationSplit), startIndex: stationSplit },
  ];

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const connectors = panel.querySelector<SVGSVGElement>(".hero-connectors");
    const paths = {
      left: connectors?.querySelector<SVGPathElement>(".hero-connector__path--left"),
      right: connectors?.querySelector<SVGPathElement>(".hero-connector__path--right"),
    };
    if (!connectors || !paths.left || !paths.right) return;

    const handleShipPosition = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number; opacity: number }>).detail;
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;
      const panelBounds = panel.getBoundingClientRect();
      if (!panelBounds.width || !panelBounds.height) return;
      const anchorX = detail.x - panelBounds.left;
      const anchorY = detail.y - panelBounds.top;
      panel.style.setProperty("--ship-anchor-x", `${anchorX}px`);
      panel.style.setProperty("--ship-anchor-y", `${anchorY}px`);
      panel.style.setProperty("--ship-anchor-opacity", String(Math.max(0, Math.min(1, detail.opacity))));

      (Object.keys(paths) as (keyof typeof paths)[]).forEach((side) => {
        const path = paths[side];
        const frame = panel.querySelector<HTMLElement>(`.hero-frame--${side === "left" ? "intro" : "proof"}`);
        const stationList = panel.querySelector<HTMLElement>(`.hero-station-list--${side}`);
        if (!path || !frame || !stationList) return;
        const frameBounds = frame.getBoundingClientRect();
        const listBounds = stationList.getBoundingClientRect();
        const targetX = side === "left"
          ? frameBounds.right - panelBounds.left - 1
          : frameBounds.left - panelBounds.left + 1;
        const targetY = listBounds.top - panelBounds.top + listBounds.height / 2;
        const sx = (anchorX / panelBounds.width) * 1000;
        const sy = (anchorY / panelBounds.height) * 1000;
        const tx = (targetX / panelBounds.width) * 1000;
        const ty = (targetY / panelBounds.height) * 1000;
        const cx = (sx + tx) / 2;
        const cy = Math.min(sy, ty) - Math.abs(tx - sx) * 0.13;
        path.setAttribute("d", `M${sx} ${sy} Q${cx} ${cy} ${tx} ${ty}`);
        panel.style.setProperty(`--${side}-dot-x`, `${targetX - anchorX}px`);
        panel.style.setProperty(`--${side}-dot-y`, `${targetY - anchorY}px`);
      });
      connectors.dataset.ready = "true";
      panel.dataset.shipAnchorReady = "true";
    };

    window.addEventListener("portfolio:ship-screen-position", handleShipPosition);
    return () => window.removeEventListener("portfolio:ship-screen-position", handleShipPosition);
  }, []);

  const setActiveConnector = (side: "left" | "right", nav: HTMLElement, active: boolean) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (active) {
      panel.dataset.activeLine = side;
    } else if (!nav.matches(":focus-within") && panel.dataset.activeLine === side) {
      delete panel.dataset.activeLine;
    }
  };

  return (
    <section className="hero-page" aria-labelledby="hero-heading" data-flight-section="hero">
      <div className="hero">
        <div className="hero-panel" ref={panelRef}>
          <div className="hero-starfield" aria-hidden="true">
            <div className="hero-starfield__layer hero-starfield__layer--far" />
            <div className="hero-starfield__layer hero-starfield__layer--near" />
          </div>
          <svg className="hero-connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="hero-connector__path hero-connector__path--left" pathLength="1" />
            <path className="hero-connector__path hero-connector__path--right" pathLength="1" />
          </svg>
          <span className="hero-connector-dot hero-connector-dot--left" aria-hidden="true" />
          <span className="hero-connector-dot hero-connector-dot--right" aria-hidden="true" />
          <div className="hero-panel__content">
            <HudFrame variant="left" className="hero-frame hero-frame--intro">
              <p className="hero-kicker">
                {profile.name} · {profile.role}
              </p>
              <h1 id="hero-heading">{profile.headline}</h1>
              <p className="hero-subline">{profile.subline}</p>
              <nav
                className="hero-station-list hero-station-list--left"
                aria-label={heroCopy.flyToLabel}
                onPointerEnter={(event) => setActiveConnector("left", event.currentTarget, true)}
                onPointerLeave={(event) => setActiveConnector("left", event.currentTarget, false)}
                onFocusCapture={(event) => setActiveConnector("left", event.currentTarget, true)}
                onBlurCapture={(event) => setActiveConnector("left", event.currentTarget, false)}
              >
                {stationGroups[0].stations.map((station, index) => (
                  <a key={station.href} href={station.href} aria-label={`Fly to ${station.label}, section ${index + 1} of ${heroStations.length}`}>
                    <span className="hero-station-tag__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span>{station.label}</span>
                  </a>
                ))}
              </nav>
            </HudFrame>
            <div className="hero-static-ship" aria-hidden="true">
              <svg viewBox="0 0 240 300" role="presentation" focusable="false">
                <path className="hero-static-ship__outline" d="M120 10 151 88 151 166 194 220 145 207 120 283 95 207 46 220 89 166 89 88Z" />
                <path className="hero-static-ship__detail" d="M120 38 132 104 132 173 120 205 108 173 108 104ZM89 166 120 185 151 166M95 207 120 217 145 207" />
                <path className="hero-static-ship__engine" d="M105 213 120 226 135 213 128 269 120 284 112 269Z" />
                <circle cx="120" cy="130" r="5" />
              </svg>
            </div>
            <HudFrame variant="right" className="hero-frame hero-frame--proof">
              <p className="hero-frame__eyebrow">{heroCopy.proofPointsLabel}</p>
              <ul className="hero-proof-points" aria-label={heroCopy.proofPointsLabel}>
                {heroProofPoints.map((point) => (
                  <li key={point.label}>
                    <span>{point.label}</span>
                    <strong>{point.value}</strong>
                  </li>
                ))}
              </ul>
              <div className="hero-actions">
                <a className="hero-action hero-action--primary" href="#projects">{heroCopy.viewProjectsLabel}</a>
                {resumeLink && (
                  <a className="hero-action hero-action--outlined" href={resumeLink.href} download>
                    {heroCopy.downloadResumeLabel}
                  </a>
                )}
              </div>
              <nav
                className="hero-station-list hero-station-list--right"
                aria-label={heroCopy.flyToLabel}
                onPointerEnter={(event) => setActiveConnector("right", event.currentTarget, true)}
                onPointerLeave={(event) => setActiveConnector("right", event.currentTarget, false)}
                onFocusCapture={(event) => setActiveConnector("right", event.currentTarget, true)}
                onBlurCapture={(event) => setActiveConnector("right", event.currentTarget, false)}
              >
                {stationGroups[1].stations.map((station, index) => (
                  <a key={station.href} href={station.href} aria-label={`Fly to ${station.label}, section ${stationSplit + index + 1} of ${heroStations.length}`}>
                    <span className="hero-station-tag__index" aria-hidden="true">{String(stationSplit + index + 1).padStart(2, "0")}</span>
                    <span>{station.label}</span>
                  </a>
                ))}
              </nav>
            </HudFrame>
          </div>
          <button
            className="hero-ship-trigger"
            type="button"
            aria-label="Make the ship perform a barrel roll"
            onClick={() => window.dispatchEvent(new Event("portfolio:ship-roll"))}
          />
          <a
            href="#toolkit"
            className="hero-skip-flight"
          >
            Skip the flight
          </a>
        </div>
      </div>
    </section>
  );
}
