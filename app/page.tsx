import { Hero } from "@/components/hero";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { ExperienceSection } from "@/components/experience-section";
import { ContactSection } from "@/components/contact-section";
import { ToolkitSection } from "@/components/toolkit-section";
import { SpaceBackground } from "@/components/space/SpaceBackground";
import { SectionRevealController } from "@/components/section-reveal-controller";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SpaceBackground />
      <SectionRevealController />
      <Hero />
      <ToolkitSection />
      <ProjectsSection />
      <ResearchSection />
      <ExperienceSection />
      <ContactSection />
    </main>
  );
}
