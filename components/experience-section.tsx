import { certifications, education, experience, experienceCopy } from "@/content/experience";
import { siteCopy } from "@/content/site";

export function ExperienceSection() {
  return (
    <section className="content-section" id="experience" aria-labelledby="experience-heading">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{siteCopy.experienceEyebrow}</p>
          <h2 id="experience-heading">{siteCopy.experienceHeading}</h2>
        </div>
      </div>

      <div className="experience-layout">
        <div className="experience-column">
          {experience.map((role) => (
            <article className="experience-entry" key={`${role.organization}-${role.role}`}>
              <p className="experience-date">
                {role.startDate} – {role.endDate}
              </p>
              <h3>{role.role}</h3>
              <p>{role.organization}</p>
              <ul>
                {role.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              {role.note && (
                <p className="content-note">
                  {experienceCopy.dateConfirmationLabel}: {role.note}
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="education-column">
          <section aria-labelledby="education-heading">
            <h3 id="education-heading">{siteCopy.educationHeading}</h3>
            {education.map((record) => (
              <article className="compact-entry" key={record.institution}>
                <h4>{record.qualification}</h4>
                <p>{record.institution}, {record.location}</p>
                <p className="experience-date">
                  {record.startYear} – {record.endYear}
                </p>
              </article>
            ))}
          </section>
          <section aria-labelledby="certifications-heading">
            <h3 id="certifications-heading">{siteCopy.certificationsHeading}</h3>
            {certifications.map((certification) => (
              <article className="compact-entry" key={certification.name}>
                <h4>{certification.name}</h4>
                <p>{certification.issuer}, {certification.year}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
