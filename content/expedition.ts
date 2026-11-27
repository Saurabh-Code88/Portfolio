/** Desktop presentation only. IDs and factual source content remain unchanged. */
export const chapters = [
  {
    id: "hero",
    label: "Home",
    title: "The departure",
    description: "Full-Stack & AI Developer",
  },
  {
    id: "toolkit",
    label: "Toolkit",
    title: "The arsenal",
    description: "Engineering capabilities",
  },
  {
    id: "projects",
    label: "Projects",
    title: "Mission archive",
    description: "Software engineering case studies",
  },
  {
    id: "research",
    label: "Research",
    title: "Beyond the known",
    description: "Academic research and experiments",
  },
  {
    id: "experience",
    label: "Experience",
    title: "Flight log",
    description: "Professional work and education",
  },
  {
    id: "contact",
    label: "Contact",
    title: "Final transmission",
    description: "Contact and professional links",
  },
] as const;
export const expeditionCopy = {
  navigation: "Chapter navigation",
  progress: "Journey progress",
  begin: "Begin Journey",
  next: "Next Chapter",
  previous: "Previous Chapter",
  return: "Return to Station",
  skip: "Skip Animation",
  direct: "Read portfolio without animation",
  returning: "Returning to station",
  preparing: "Preparing the Home environment",
  arriving: "Approaching the station",
  eyebrow: "Engineer · Builder · Explorer",
  role: "Full-Stack & AI Developer",
  description:
    "I build intelligent applications, reliable backend systems and interactive digital experiences.",
  toolkitHeading: "Full-stack and AI engineering",
  toolkitIntro:
    "From product interfaces and AI workflows to data, delivery and reliable services.",
  caseStudy: "Engineering case study",
  objective: "Research objective",
  outcome: "Findings and limitations",
  experience: "Professional experience and education",
  contact: "Build something together",
} as const;
export const engineeringGroups = [
  {
    name: "Full-stack engineering",
    note: "Interfaces, APIs and persistent data",
    tools: ["React", "Node.js", "Express", "FastAPI", "PostgreSQL", "Prisma"],
  },
  {
    name: "AI and machine learning",
    note: "Model workflows and retrieval",
    tools: ["Python", "LangGraph", "Groq", "Gemini", "pgvector"],
  },
  {
    name: "Systems and developer tools",
    note: "Queues, streaming, collaboration and delivery",
    tools: [
      "Redis",
      "Bull",
      "Socket.io",
      "SSE",
      "Yjs",
      "Docker",
      "CI/CD",
      "Playwright",
      "Judge0",
      "Monaco Editor",
    ],
  },
] as const;
