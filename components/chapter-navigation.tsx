"use client";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useActiveSection } from "@/components/active-section-provider";
import { chapters, expeditionCopy as copy } from "@/content/expedition";
import { profile } from "@/content/profile";
import { chapterNeighbors, cinematicChapters } from "@/lib/chapterNavigation";
import { journeyRevealPosition } from "@/lib/horizontalJourney";
import { stationReturnStatus } from "@/lib/stationReturnStatus";

export function ChapterNavigation() {
  const active = useActiveSection();
  const { index, current, previous, next } = chapterNeighbors(active ?? "hero");
  const phase = useSyncExternalStore(
    stationReturnStatus.subscribe,
    stationReturnStatus.getSnapshot,
    stationReturnStatus.getServerSnapshot,
  );
  const progress = useRef<HTMLProgressElement>(null);
  const introduction = useRef<HTMLElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (phase === "departing") {
      returnFocus.current = true;
      document
        .querySelector<HTMLButtonElement>(".station-return__controls button")
        ?.focus({ preventScroll: true });
    }
    if (phase === "idle" && active === "hero" && returnFocus.current) {
      introduction.current
        ?.querySelector<HTMLElement>("h1")
        ?.focus({ preventScroll: true });
      returnFocus.current = false;
    }
  }, [phase, active]);
  useEffect(() => {
    const fallback = () => {
      if (
        !cinematicChapters(
          window.innerWidth,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          Boolean(journeyRevealPosition.getSnapshot()),
          document.body.classList.contains("space-canvas-active"),
        )
      ) {
        window.dispatchEvent(
          new CustomEvent("portfolio:flight-to", {
            detail: { sectionId: "hero", instant: true },
          }),
        );
      }
    };
    window.addEventListener("portfolio:return-station", fallback);
    return () =>
      window.removeEventListener("portfolio:return-station", fallback);
  }, []);
  useEffect(
    () =>
      journeyRevealPosition.subscribe(() => {
        const state = journeyRevealPosition.getSnapshot();
        if (progress.current && state)
          progress.current.value =
            state.x / Math.max(1, state.panels.at(-1)?.offset ?? 1);
        if (introduction.current && state) {
          const opacity = Math.max(
            0,
            1 - state.x / Math.max(1, state.width * 0.25),
          );
          introduction.current.style.opacity = String(opacity);
          introduction.current.style.visibility =
            opacity > 0 ? "visible" : "hidden";
          introduction.current.inert = opacity === 0;
        }
      }),
    [],
  );
  return (
    <>
      {active === "hero" && (
        <section
          className="chapter-introduction"
          ref={introduction}
          aria-labelledby="chapter-introduction-heading"
        >
          <p className="chapter-introduction__eyebrow">{copy.eyebrow}</p>
          <h1 id="chapter-introduction-heading" tabIndex={-1}>
            {profile.name}
          </h1>
          <p className="chapter-introduction__role">{copy.role}</p>
          <p>{copy.description}</p>
          <a className="chapter-button" href="#toolkit">
            {copy.begin} <span aria-hidden="true">→</span>
          </a>
        </section>
      )}
      <nav className="chapter-navigation" aria-label={copy.navigation}>
        <div
          className="chapter-navigation__identity"
          key={current.id}
          aria-live="polite"
        >
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(chapters.length).padStart(2, "0")} · {current.label}
          </span>
          <strong>{current.title}</strong>
          <small>{current.description}</small>
        </div>
        <progress
          ref={progress}
          max="1"
          defaultValue="0"
          aria-label={copy.progress}
        />
        <div className="chapter-navigation__actions">
          {previous && (
            <a
              className="chapter-previous"
              href={`#${previous.id}`}
              aria-label={`${copy.previous}: ${previous.label}`}
            >
              ← <span>{copy.previous}</span>
            </a>
          )}
          {next ? (
            <a className="chapter-button" href={`#${next.id}`}>
              {index === 0 ? copy.begin : copy.next}{" "}
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <button
              className="chapter-button"
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event("portfolio:return-station"))
              }
            >
              {copy.return} <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
        <Link
          className="chapter-direct"
          href="/?ship=off#toolkit"
          prefetch={false}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            window.location.assign("/?ship=off#toolkit");
          }}
        >
          {copy.direct}
        </Link>
      </nav>
      <div className="station-return" aria-hidden="true">
        <div className="station-return__veil" />
        {phase !== "idle" && (
          <svg
            className="station-return__stars"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 44 }, (_, i) => {
              const a = i * 2.39996,
                r = 90 + (i % 7) * 52,
                x = Math.cos(a),
                y = Math.sin(a);
              return (
                <line
                  key={i}
                  x1={500 + x * r}
                  y1={500 + y * r}
                  x2={500 + x * (r + 30 + (i % 5) * 15)}
                  y2={500 + y * (r + 30 + (i % 5) * 15)}
                  style={{ animationDelay: `${(i % 9) * -0.21}s` }}
                />
              );
            })}
          </svg>
        )}
      </div>
      {phase !== "idle" && (
        <div className="station-return__controls" role="status">
          <span>
            {phase === "preparing"
              ? copy.preparing
              : phase === "approach"
                ? copy.arriving
                : copy.returning}
          </span>
          <button
            className="chapter-button"
            onClick={() =>
              window.dispatchEvent(new Event("portfolio:return-skip"))
            }
          >
            {copy.skip}
          </button>
        </div>
      )}
    </>
  );
}
