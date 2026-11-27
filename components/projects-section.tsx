import { TechnologyStack } from "@/components/technology-stack";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { ProjectActions } from "@/components/project-actions";
import { projects, projectsCopy } from "@/content/projects";
import { siteCopy } from "@/content/site";
import { expeditionCopy } from "@/content/expedition";

export function ProjectsSection({
  headingLevel = 2,
}: {
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      className="content-section projects-section"
      id="projects"
      aria-labelledby="projects-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">{siteCopy.projectsEyebrow}</p>
          <Heading id="projects-heading">{siteCopy.projectsHeading}</Heading>
        </div>
        <p>{projectsCopy.listingIntro}</p>
      </div>

      <div className="editorial-projects chapter-only">
        {projects.map((project, index) => (
          <article
            className="editorial-project"
            key={project.slug}
            aria-labelledby={`case-${project.slug}`}
          >
            <span className="editorial-index">
              {String(index + 1).padStart(2, "0")} / {expeditionCopy.caseStudy}
            </span>
            <h3 id={`case-${project.slug}`}>{project.title}</h3>
            <p className="editorial-subtitle">{project.oneLiner}</p>
            <h4>{siteCopy.problemHeading}</h4>
            <p>{project.problem}</p>
            <h4>{siteCopy.architectureHeading}</h4>
            <p>{project.architecture.replace(/ Diagram:.*$/, "")}</p>
            {project.highlights.length > 0 && (
              <ul className="editorial-highlights">
                {project.highlights.slice(0, 4).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            {project.metric && (
              <p className="project-metric">
                {project.metric.value} / {project.metric.label}
              </p>
            )}
            <TechnologyStack tools={project.stack} />
            <ProjectActions project={project} />
            <details className="editorial-architecture">
              <summary>{siteCopy.architectureHeading}</summary>
              <ArchitectureDiagram project={project} />
              <Link href={`/projects/${project.slug}`}>
                {siteCopy.projectDetailLabel}
              </Link>
            </details>
          </article>
        ))}
      </div>
      <div className="project-list portfolio-original">
        {projects.map((project) => (
          <div className="project-case" key={project.slug}>
            <details className="project-card">
              <summary className="project-card__summary">
                {headingLevel === 1 ? (
                  <h2>{project.title}</h2>
                ) : (
                  <h3>{project.title}</h3>
                )}
                <p>{project.oneLiner}</p>
                <small className="chapter-only">
                  {expeditionCopy.caseStudy}
                </small>
                <ul
                  className="tag-list project-card__tags"
                  aria-label={`${project.title} technologies`}
                >
                  {project.stack.map((technology) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>
              </summary>
              <div className="project-card__details">
                <ArchitectureDiagram project={project} />
                <div className="project-card__body">
                  <div>
                    <p>{project.problem}</p>
                    {project.metric && (
                      <p className="project-metric">
                        <span>{project.metric.value}</span>{" "}
                        {project.metric.label}
                      </p>
                    )}
                    <ul className="result-list">
                      {project.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                    <Link
                      className="project-detail-link"
                      href={`/projects/${project.slug}`}
                    >
                      {siteCopy.projectDetailLabel}
                    </Link>
                  </div>
                  <ProjectActions project={project} />
                </div>
              </div>
            </details>
            <div className="chapter-project-links chapter-only">
              <ProjectActions project={project} />
              <Link href={`/projects/${project.slug}`}>
                {siteCopy.projectDetailLabel} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
