/* eslint-disable @next/next/no-img-element -- Local decorative brand SVG. */
import { socialIcons } from "@/content/technologies";
import { profile, profileContactLinks } from "@/content/profile";
import { siteCopy } from "@/content/site";
import { expeditionCopy } from "@/content/expedition";

export function ContactSection() {
  return (
    <section
      className="content-section contact-section"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">{profile.location}</p>
          <h2 id="contact-heading">{siteCopy.contactHeading}</h2>
        </div>
        <p>
          <span className="portfolio-original">{siteCopy.contactPrompt}</span>
          <span className="chapter-only">{expeditionCopy.contact}</span>
        </p>
      </div>
      <nav aria-label={siteCopy.contactHeading} className="contact-links">
        {profileContactLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            {...(link.download
              ? { download: true }
              : { target: "_blank", rel: "noreferrer" })}
          >
            {socialIcons[link.label] && (
              <img
                className="chapter-only social-icon"
                src={`/icons/technology/${socialIcons[link.label]}.svg`}
                width={22}
                height={22}
                alt=""
                aria-hidden="true"
              />
            )}
            {link.label}
            {!link.download && <span aria-hidden="true"> ↗</span>}
          </a>
        ))}
      </nav>
    </section>
  );
}
