import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { ProjectActions } from "@/components/project-actions";
import { projects, projectsCopy } from "@/content/projects";
import { siteCopy } from "@/content/site";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  return project ? { title: `${project.title} | Saurabh Pramanik` } : {};
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) notFound();

  const architectureDescription = project.architecture.split(/\s+Diagram:/i)[0];

  return (
    <main id="main-content" className="inner-page project-detail" tabIndex={-1}>
      <header className="project-detail__header">
        <Link className="back-link" href="/projects">
          ← {siteCopy.allProjectsLabel}
        </Link>
        <p className="section-kicker">{siteCopy.projectDetailLabel}</p>
        <h1>{project.title}</h1>
        <p className="project-detail__intro">{project.oneLiner}</p>
      </header>

      <section className="detail-section" aria-labelledby="architecture-heading">
        <h2 id="architecture-heading">{siteCopy.architectureHeading}</h2>
        <ArchitectureDiagram project={project} />
        <p className="architecture-description">{architectureDescription}</p>
      </section>

      <section className="detail-section" aria-labelledby="problem-heading">
        <h2 id="problem-heading">{siteCopy.problemHeading}</h2>
        <p>{project.problem}</p>
      </section>

      <section className="detail-section" aria-labelledby="result-heading">
        <h2 id="result-heading">{siteCopy.resultHeading}</h2>
        {project.highlights.length > 0 && (
          <>
            <h3>{projectsCopy.highlightsHeading}</h3>
            <ul className="result-list">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </>
        )}
        {project.metric && (
          <p className="project-metric">
            <span>{project.metric.label}: </span>
            {project.metric.value}
          </p>
        )}
        {project.highlights.length === 0 && !project.metric && (
          <p>{projectsCopy.noResultNote}</p>
        )}
      </section>

      <section className="detail-section" aria-labelledby="stack-heading">
        <h2 id="stack-heading">{siteCopy.stackHeading}</h2>
        <ul className="tag-list">
          {project.stack.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </section>

      <ProjectActions project={project} />
    </main>
  );
}
