import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { ProjectActions } from "@/components/project-actions";
import { projects, projectsCopy } from "@/content/projects";
import { siteCopy } from "@/content/site";
import { expeditionCopy } from "@/content/expedition";

export function ProjectsSection({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className="content-section projects-section" id="projects" aria-labelledby="projects-heading">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{siteCopy.projectsEyebrow}</p>
          <Heading id="projects-heading">{siteCopy.projectsHeading}</Heading>
        </div>
        <p>{projectsCopy.listingIntro}</p>
      </div>

      <div className="project-list">
        {projects.map((project) => (
          <div className="project-case" key={project.slug}><details className="project-card">
            <summary className="project-card__summary">
              {headingLevel === 1 ? <h2>{project.title}</h2> : <h3>{project.title}</h3>}
              <p>{project.oneLiner}</p>
              <small className="chapter-only">{expeditionCopy.caseStudy}</small>
              <ul className="tag-list project-card__tags" aria-label={`${project.title} technologies`}>
                {project.stack.map((technology) => <li key={technology}>{technology}</li>)}
              </ul>
            </summary>
            <div className="project-card__details">
              <ArchitectureDiagram project={project} />
              <div className="project-card__body">
                <div>
                  <p>{project.problem}</p>
                  {project.metric && <p className="project-metric"><span>{project.metric.value}</span> {project.metric.label}</p>}
                  <ul className="result-list">
                    {project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                  <Link className="project-detail-link" href={`/projects/${project.slug}`}>{siteCopy.projectDetailLabel}</Link>
                </div>
                <ProjectActions project={project} />
              </div>
            </div>
          </details><div className="chapter-project-links chapter-only"><ProjectActions project={project} /><Link href={`/projects/${project.slug}`}>{siteCopy.projectDetailLabel} →</Link></div></div>
        ))}
      </div>
    </section>
  );
}
