import { Hero } from "@/components/hero";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { ExperienceSection } from "@/components/experience-section";
import { ContactSection } from "@/components/contact-section";
import { ToolkitSection } from "@/components/toolkit-section";
import { SpaceBackground } from "@/components/space/SpaceBackground";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SpaceBackground />
      <Hero />
      <ToolkitSection />
      <ProjectsSection />
      <ResearchSection />
      <ExperienceSection />
      <ContactSection />
    </main>
  );
}
