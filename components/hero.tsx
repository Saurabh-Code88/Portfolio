"use client";

import { profile, profileContactLinks } from "@/content/profile";
import { heroCopy, heroProofPoints, heroStations } from "@/content/hero";

export function Hero() {
  const resumeLink = profileContactLinks.find(({ download }) => download);

  return (
    <section className="hero-page" aria-labelledby="hero-heading" data-flight-section="hero">
      <div className="hero">
        <div className="hero-panel">
          <div className="hero-starfield" aria-hidden="true">
            <div className="hero-starfield__layer hero-starfield__layer--far" />
            <div className="hero-starfield__layer hero-starfield__layer--near" />
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
          <div className="hero-panel__content">
            <p className="hero-kicker">
              {profile.name} · {profile.role}
            </p>
            <h1 id="hero-heading">{profile.headline}</h1>
            <p className="hero-subline">{profile.subline}</p>
            <div className="hero-actions">
              <a className="hero-action hero-action--primary" href="#projects">{heroCopy.viewProjectsLabel}</a>
              {resumeLink && (
                <a className="hero-action hero-action--outlined" href={resumeLink.href} download>
                  {heroCopy.downloadResumeLabel}
                </a>
              )}
            </div>
            <ul className="hero-proof-points" aria-label={heroCopy.proofPointsLabel}>
              {heroProofPoints.map((point) => (
                <li key={point.label}>
                  <span>{point.label}</span>
                  <strong>{point.value}</strong>
                </li>
              ))}
            </ul>
            <nav className="hero-stations" aria-label={heroCopy.flyToLabel}>
              <span className="hero-stations__label">{heroCopy.flyToLabel}</span>
              {heroStations.map((station) => (
                <a key={station.href} href={station.href}>{station.label}</a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
