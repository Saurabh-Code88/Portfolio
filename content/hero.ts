import { projects } from "./projects";
import { research } from "./research";
import { siteCopy } from "./site";

export const heroCopy = {
  viewProjectsLabel: "View projects",
  downloadResumeLabel: "Download resume",
  proofPointsLabel: "Portfolio highlights",
  flyToLabel: "Fly to",
} as const;

export const heroStations = [
  { label: "Toolkit", href: "#toolkit" },
  { label: siteCopy.projectsHeading, href: "#projects" },
  { label: siteCopy.researchHeading, href: "#research" },
  { label: siteCopy.experienceHeading, href: "#experience" },
  { label: siteCopy.contactHeading, href: "#contact" },
] as const;

const acceptedPaper = research[0];
const critique = projects.find(({ slug }) => slug === "kritique");
const firstTokenResult = critique?.metric?.value.match(/First token in (.+?) vs\./)?.[1];

export const heroProofPoints = [
  ...(acceptedPaper ? [{ label: siteCopy.acceptedAtPrefix, value: acceptedPaper.venue }] : []),
  { label: "Projects", value: String(projects.length) },
  ...(critique?.metric && firstTokenResult
    ? [{
        label: `${critique.title.split(":")[0]} ${critique.metric.label.split(" and ")[0].toLowerCase()}`,
        value: firstTokenResult,
      }]
    : []),
];
