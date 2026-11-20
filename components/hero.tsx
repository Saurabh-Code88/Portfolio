"use client";

import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { profile } from "@/content/profile";
import { askCopy } from "@/content/ask";
import { ASK_LIMITS } from "@/lib/ask-config";

export function Hero() {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const hasUnrolled = useRef(false);
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

  useEffect(() => {
    if (hasUnrolled.current) return;
    hasUnrolled.current = true;

    if (reduceMotion) {
      controls.set("unrolled");
      return;
    }

    controls.set("rolled");
    void controls.start("unrolled");
  }, [controls, reduceMotion]);

  return (
    <section className="hero-page" aria-labelledby="hero-heading">
      <div className="hero">
        <motion.div
          className="hero-scroll"
          initial={false}
          animate={controls}
          variants={{
            rolled: { clipPath: "inset(0 0 86% 0 round 24px)" },
            unrolled: { clipPath: "inset(0 0 0% 0 round 24px)" },
          }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        >
          <svg
            className="hero-scroll__art"
            viewBox="0 0 1200 760"
            preserveAspectRatio="none"
            role="img"
            aria-labelledby="scroll-title scroll-description"
          >
            <title id="scroll-title">An original dragon scroll</title>
            <desc id="scroll-description">
              An amber-edged scroll with wooden rollers, brush details and a hand-drawn dragon.
            </desc>
            <path
              d="M82 66 Q600 48 1118 66 L1140 82 L1140 676 L1118 694 Q600 712 82 694 L60 676 L60 82 Z"
              fill="var(--surface)"
              stroke="var(--rust)"
              strokeWidth="3"
            />
            <path
              d="M85 91 Q600 78 1115 91 M85 669 Q600 682 1115 669"
              fill="none"
              stroke="var(--ember)"
              strokeWidth="2"
            />
            <g fill="var(--surface-2)" stroke="var(--rust)" strokeWidth="3">
              <path d="M42 67 Q32 80 42 93 L1158 93 Q1168 80 1158 67 Q600 49 42 67Z" />
              <path d="M42 667 Q32 680 42 693 L1158 693 Q1168 680 1158 667 Q600 685 42 667Z" />
              <circle cx="42" cy="80" r="20" />
              <circle cx="1158" cy="80" r="20" />
              <circle cx="42" cy="680" r="20" />
              <circle cx="1158" cy="680" r="20" />
            </g>
            <g fill="none" stroke="var(--rust)" strokeLinecap="round" strokeWidth="3">
              <path d="M68 80 H1132 M68 680 H1132" />
              <path d="M77 105 V655 M1123 105 V655" stroke="var(--ember)" strokeWidth="2" />
              <path d="M97 127 C110 145 110 163 97 181 M1103 127 C1090 145 1090 163 1103 181" />
              <path d="M97 579 C110 597 110 615 97 633 M1103 579 C1090 597 1090 615 1103 633" />
            </g>

            <g
              className="hero-scroll__dragon"
              fill="none"
              stroke="var(--rust)"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M812 540 C900 521 867 458 959 450 C1027 444 1052 398 1007 365 C972 339 920 374 946 405 C970 433 1014 402 989 384" strokeWidth="13" />
              <path d="M824 542 C885 510 915 561 965 530 C1009 503 975 470 1006 445 C1035 423 1071 442 1080 469" strokeWidth="8" />
              <path d="M954 365 C948 335 971 312 998 317 C1008 284 1049 279 1066 309 C1096 309 1110 342 1088 360 C1085 385 1057 400 1033 384 L1008 403 L984 385" strokeWidth="7" />
              <path d="M1001 318 C981 291 988 270 1007 258 C1014 281 1024 289 1037 296 M1058 307 C1074 282 1095 282 1107 296 C1089 302 1082 315 1080 330" strokeWidth="6" />
              <path d="M1094 347 L1121 336 M1094 357 L1126 361 M1042 381 C1047 404 1037 413 1028 423" strokeWidth="4" />
              <circle cx="1064" cy="337" r="4" fill="var(--rust)" stroke="none" />
              <path d="M877 511 l-11 -12 m33 5 l-7 -15 m35 5 l-2 -16 m48 38 l-14 -9 m22 27 l-14 -5 m-81 -19 l-14 -5" strokeWidth="3" />
              <path d="M837 532 C817 526 803 515 797 502 M837 532 C819 546 803 550 791 547" strokeWidth="4" />
            </g>
            <g fill="var(--amber)">
              <circle cx="155" cy="143" r="3" />
              <circle cx="174" cy="143" r="3" />
              <circle cx="193" cy="143" r="3" />
            </g>
            <path d="M158 612 C180 590 194 594 208 613 C191 631 175 632 158 612Z" fill="none" stroke="var(--rust)" strokeWidth="2" />
            <path d="M183 606 C181 613 181 620 185 626" fill="none" stroke="var(--rust)" strokeWidth="2" />
          </svg>

          <div className="hero-scroll__content">
            <p className="hero-kicker">
              {profile.name} · {profile.role}
            </p>
            <h1 id="hero-heading">{profile.headline}</h1>
            <p className="hero-subline">{profile.subline}</p>
            <form className="hero-ask" onSubmit={handleAsk}>
              <label htmlFor="dragon-question">{profile.askLabel}</label>
              <input
                id="dragon-question"
                type="text"
                placeholder={profile.askPlaceholder}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={ASK_LIMITS.inputCharacters}
                aria-describedby="dragon-status"
              />
              <button className="hero-ask__button" type="submit" disabled={isAsking || !question.trim()}>
                {isAsking ? askCopy.askingButton : askCopy.askButton}
              </button>
              <p id="dragon-status" className="hero-ask__status" role="status" aria-live="polite">{status}</p>
              {answer && <p className="hero-ask__answer" aria-live="polite">{answer}</p>}
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
