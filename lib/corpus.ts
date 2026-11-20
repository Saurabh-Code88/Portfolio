import { certifications, education, experience } from "../content/experience.ts";
import { profile } from "../content/profile.ts";
import { projects } from "../content/projects.ts";
import { research } from "../content/research.ts";

export type CorpusChunk = { id: string; title: string; text: string };

// Imported content is serialized into the server bundle at build time.
export const portfolioCorpus: CorpusChunk[] = [
  { id: "profile", title: "Profile", text: `${profile.name}. ${profile.role}. ${profile.location}. ${profile.headline} ${profile.subline}` },
  ...projects.flatMap((project) => [
    { id: `${project.slug}-overview`, title: project.title, text: `${project.title}. ${project.oneLiner} ${project.stack.join(", ")}.` },
    { id: `${project.slug}-architecture`, title: `${project.title} architecture`, text: `${project.title}. ${project.architecture} ${project.stack.join(", ")}.` },
    { id: `${project.slug}-results`, title: `${project.title} results`, text: `${project.title}. ${project.problem} ${project.highlights.join(". ")} ${project.metric ? `${project.metric.label}: ${project.metric.value}` : ""}` },
  ]),
  ...research.map((item, index) => ({ id: `research-${index}`, title: item.title, text: `${item.title}. ${item.summary} ${item.venue} ${item.year}. ${item.stack.join(", ")}. ${item.finding} Co-authors: ${item.coAuthors.join(", ")}. Advisor: ${item.advisor}, ${item.institution}.` })),
  ...experience.map((item, index) => ({ id: `experience-${index}`, title: item.role, text: `${item.role} at ${item.organization}, ${item.startDate} to ${item.endDate}. ${item.highlights.join(" ")}` })),
  ...education.map((item, index) => ({ id: `education-${index}`, title: item.qualification, text: `${item.qualification}, ${item.institution}, ${item.location}, ${item.startYear} to ${item.endYear}.` })),
  ...certifications.map((item, index) => ({ id: `certification-${index}`, title: item.name, text: `${item.name}, ${item.issuer}, ${item.year}.` })),
  { id: "contact", title: "Contact", text: `Contact ${profile.name} via email ${profile.links.email}, GitHub ${profile.links.github}, LinkedIn ${profile.links.linkedin}, X ${profile.links.x}, or LeetCode ${profile.links.leetcode}.` },
];
