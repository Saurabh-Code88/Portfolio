"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";

const navigation = [
  { id: "toolkit", label: "TOOLKIT", href: "/#toolkit" },
  { id: "projects", label: "PROJECTS", href: "/#projects" },
  { id: "research", label: "RESEARCH", href: "/#research" },
  { id: "experience", label: "ABOUT", href: "/#experience" },
  { id: "contact", label: "CONTACT", href: "/#contact" },
] as const;

export function SiteNav() {
  const [activeId, setActiveId] = useState<(typeof navigation)[number]["id"] | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  const scrollActiveIntoView = useCallback(() => {
    const nav = navRef.current;
    const link = activeLinkRef.current;
    if (!nav || !link || window.innerWidth >= 768) return;
    const left = link.offsetLeft - nav.offsetLeft - (nav.clientWidth - link.clientWidth) / 2;
    nav.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, []);

  useEffect(() => {
    const sections = [
      document.querySelector<HTMLElement>("[data-flight-section='hero']"),
      ...navigation.map(({ id }) => document.getElementById(id)),
    ]
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const positions = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.flightSection || entry.target.id;
        if (entry.isIntersecting) positions.set(key, entry.boundingClientRect.top);
        else positions.delete(key);
      }
      const nearest = [...positions.entries()].sort(
        (a, b) => Math.abs(a[1] - window.innerHeight * 0.28) - Math.abs(b[1] - window.innerHeight * 0.28),
      )[0];
      if (nearest) setActiveId(nearest[0] === "hero" ? null : nearest[0] as (typeof navigation)[number]["id"]);
    }, { rootMargin: "-18% 0px -70% 0px", threshold: 0 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    scrollActiveIntoView();
  }, [activeId, scrollActiveIntoView]);

  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label={`${profile.name}, home`}>
        <span className="site-brand__seal" aria-hidden="true">SP</span>
        <span>{profile.name}</span>
      </Link>
      <nav aria-label="Section readout" className="site-nav" ref={navRef}>
        {navigation.map((item, index) => (
          <Link
            aria-current={activeId === item.id ? "location" : undefined}
            className="site-nav__link"
            href={item.href}
            key={item.id}
            ref={activeId === item.id ? activeLinkRef : undefined}
            style={{ animationDelay: `${950 + index * 60}ms` }}
          >
            <span className="site-nav__index">{String(index + 1).padStart(2, "0")}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="site-header__actions">
        <Link className="site-header__skip" href="/#toolkit">Skip the flight</Link>
        <Link className="site-header__contact" href="/#contact">Let’s talk <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
