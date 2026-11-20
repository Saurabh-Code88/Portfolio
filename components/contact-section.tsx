import { profile, profileContactLinks } from "@/content/profile";
import { siteCopy } from "@/content/site";

export function ContactSection() {
  return (
    <section className="content-section contact-section" id="contact" aria-labelledby="contact-heading">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{profile.location}</p>
          <h2 id="contact-heading">{siteCopy.contactHeading}</h2>
        </div>
        <p>{siteCopy.contactPrompt}</p>
      </div>
      <nav aria-label={siteCopy.contactHeading} className="contact-links">
        {profileContactLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            {...(link.download ? { download: true } : { target: "_blank", rel: "noreferrer" })}
          >
            {link.label}
            {!link.download && <span aria-hidden="true"> ↗</span>}
          </a>
        ))}
      </nav>
    </section>
  );
}
