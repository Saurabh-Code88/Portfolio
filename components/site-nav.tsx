"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useActiveSection } from "@/components/active-section-provider";
import { profile } from "@/content/profile";
import { cockpitSections } from "@/content/cockpit";
import { ChapterNavigation } from "@/components/chapter-navigation";

const navigation = cockpitSections.slice(1).map((section) => ({ ...section, href: `/#${section.id}` }));

export function SiteNav() {
  const activeId = useActiveSection();
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
    scrollActiveIntoView();
  }, [activeId, scrollActiveIntoView]);

  return (
    <><header className="site-header">
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
            <span className="site-nav__journey-index" aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="site-header__actions">
        <Link className="site-header__skip" href="/#toolkit">Skip the flight</Link>
        <Link className="site-header__contact" href="/#contact">Let’s talk <span aria-hidden="true">↗</span></Link>
      </div>
    </header><ChapterNavigation /></>
  );
}
