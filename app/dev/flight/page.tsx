import type { Metadata } from "next";
import FlightPreview from "@/app/dev/flight/FlightPreview";
import { Hero } from "@/components/hero";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { ExperienceSection } from "@/components/experience-section";
import { ContactSection } from "@/components/contact-section";
import { ToolkitSection } from "@/components/toolkit-section";
import { SpaceBackground } from "@/components/space/SpaceBackground";
import { SectionRevealController } from "@/components/section-reveal-controller";

export const metadata: Metadata = {
  title: "Flight preview",
  robots: { index: false, follow: false },
};

export default function FlightPreviewRoute() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SpaceBackground />
      <SectionRevealController />
      <FlightPreview />
      <Hero />
      <ToolkitSection />
      <ProjectsSection />
      <ResearchSection />
      <ExperienceSection />
      <ContactSection />
    </main>
  );
}
