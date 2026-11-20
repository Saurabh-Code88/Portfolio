import { siteCopy } from "@/content/site";
import type { Project } from "@/content/projects";

export function ProjectActions({ project }: { project: Project }) {
  return (
    <div className="project-actions">
      <a href={project.repoUrl} target="_blank" rel="noreferrer">
        {siteCopy.repositoryLabel}
        <span aria-hidden="true"> ↗</span>
      </a>
      {project.liveUrl ? (
        <a href={project.liveUrl} target="_blank" rel="noreferrer">
          {siteCopy.liveDemoLabel}
          <span aria-hidden="true"> ↗</span>
        </a>
      ) : (
        <button type="button" disabled>
          {siteCopy.demoUnavailableLabel}
        </button>
      )}
    </div>
  );
}
