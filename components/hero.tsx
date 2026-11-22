"use client";

import { profile } from "@/content/profile";

export function Hero() {
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
            onClick={() => window.dispatchEvent(new Event("portfolio:skip-flight"))}
          >
            Skip the flight
          </a>
          <div className="hero-panel__content">
            <p className="hero-kicker">
              {profile.name} · {profile.role}
            </p>
            <h1 id="hero-heading">{profile.headline}</h1>
            <p className="hero-subline">{profile.subline}</p>
            <div className="hero-ask-space" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
