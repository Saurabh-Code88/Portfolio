import type { Metadata } from "next";
import { ProjectsSection } from "@/components/projects-section";

export const metadata: Metadata = {
  title: "Projects | Saurabh Pramanik",
};

export default function ProjectsPage() {
  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <ProjectsSection headingLevel={1} />
    </main>
  );
}
