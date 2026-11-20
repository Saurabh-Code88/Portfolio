import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { ProjectActions } from "@/components/project-actions";
import { projects, projectsCopy } from "@/content/projects";
import { siteCopy } from "@/content/site";

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
          <article className="project-card" key={project.slug}>
            <ArchitectureDiagram project={project} />
            <div className="project-card__body">
              <div>
              {headingLevel === 1 ? (
                <h2><Link href={`/projects/${project.slug}`}>{project.title}</Link></h2>
              ) : (
                <h3><Link href={`/projects/${project.slug}`}>{project.title}</Link></h3>
              )}
                <p>{project.oneLiner}</p>
              </div>
              <ProjectActions project={project} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
