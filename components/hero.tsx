"use client";

import { profile, profileContactLinks } from "@/content/profile";
import { heroCopy, heroProofPoints } from "@/content/hero";
import { HudFrame } from "@/components/hud-frame";

export function Hero() {
  const resumeLink = profileContactLinks.find(({ download }) => download);

  return (
    <section id="hero" className="hero-page" aria-labelledby="hero-heading" data-flight-section="hero">
      <h1 className="hero-cinematic-identity sr-only">{profile.headline}</h1>
      <div className="hero">
        <div className="hero-panel">
          <div className="hero-starfield" aria-hidden="true">
            <div className="hero-starfield__layer hero-starfield__layer--far" />
            <div className="hero-starfield__layer hero-starfield__layer--near" />
          </div>
          <div className="hero-panel__content">
            <HudFrame variant="left" className="hero-frame hero-frame--intro">
              <p className="hero-kicker">
                {profile.name} · {profile.role}
              </p>
              <h1 id="hero-heading">{profile.headline}</h1>
              <p className="hero-subline">{profile.subline}</p>
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
            </HudFrame>
          </div>
          <button
            className="hero-ship-trigger"
            type="button"
            aria-label="Make the ship perform a barrel roll"
            onClick={() => window.dispatchEvent(new Event("portfolio:ship-roll"))}
          />
        </div>
      </div>
    </section>
  );
}
