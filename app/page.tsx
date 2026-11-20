import { Hero } from "@/components/hero";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { ExperienceSection } from "@/components/experience-section";
import { ContactSection } from "@/components/contact-section";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Hero />
      <ProjectsSection />
      <ResearchSection />
      <ExperienceSection />
      <ContactSection />
    </main>
  );
}
