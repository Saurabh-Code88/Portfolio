"use client";

import { useState, type FormEvent } from "react";
import { profile } from "@/content/profile";
import { askCopy } from "@/content/ask";
import { ASK_LIMITS } from "@/lib/ask-config";

export function Hero() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState(profile.askStatus);
  const [isAsking, setIsAsking] = useState(false);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || isAsking) return;
    setAnswer("");
    setStatus(askCopy.askingButton);
    setIsAsking(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(errorBody?.error ?? askCopy.clientError);
        return;
      }
      if (!response.body) throw new Error("Missing response stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completeAnswer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventData of events) {
          const data = eventData.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data || data === "[DONE]") continue;
          const payload = JSON.parse(data) as { token?: string; error?: string };
          if (payload.error) throw new Error(payload.error);
          if (payload.token) {
            completeAnswer += payload.token;
            setAnswer(completeAnswer);
          }
        }
      }
      setStatus(askCopy.inputHint);
    } catch (error) {
      setStatus(error instanceof Error && error.message !== "Missing response stream" ? error.message : askCopy.clientError);
    } finally {
      setIsAsking(false);
    }
  }

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
            <form className="hero-ask" onSubmit={handleAsk}>
              <label htmlFor="ship-question">{profile.askLabel}</label>
              <input
                id="ship-question"
                type="text"
                placeholder={profile.askPlaceholder}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={ASK_LIMITS.inputCharacters}
                aria-describedby="ship-status"
              />
              <button className="hero-ask__button" type="submit" disabled={isAsking || !question.trim()}>
                {isAsking ? askCopy.askingButton : askCopy.askButton}
              </button>
              <p id="ship-status" className="hero-ask__status" role="status" aria-live="polite">{status}</p>
              {answer && <p className="hero-ask__answer" aria-live="polite">{answer}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
