export type Technology = {
  id: string;
  name: string;
  icon?: string;
  color: string;
  dark?: boolean;
  aliases?: readonly string[];
};
/** Only verified portfolio technologies. No substitute logos for protocols or unbundled brands. */
export const technologies: readonly Technology[] = [
  { id: "react", name: "React", icon: "react", color: "#61dafb" },
  { id: "nodejs", name: "Node.js", icon: "nodejs", color: "#5fa04e" },
  { id: "python", name: "Python", icon: "python", color: "#3776ab" },
  {
    id: "express",
    name: "Express",
    icon: "express",
    color: "#ffffff",
    dark: true,
  },
  { id: "fastapi", name: "FastAPI", icon: "fastapi", color: "#009688" },
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: "postgresql",
    color: "#4169e1",
  },
  { id: "redis", name: "Redis", icon: "redis", color: "#dc382d" },
  {
    id: "prisma",
    name: "Prisma",
    icon: "prisma",
    color: "#ffffff",
    dark: true,
  },
  { id: "docker", name: "Docker", icon: "docker", color: "#2496ed" },
  {
    id: "playwright",
    name: "Playwright",
    icon: "playwright",
    color: "#2ead33",
  },
  {
    id: "socketio",
    name: "Socket.io",
    icon: "socketio",
    color: "#ffffff",
    dark: true,
  },
  {
    id: "langgraph",
    name: "LangGraph",
    icon: "langgraph",
    color: "#ffffff",
    dark: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "googlegemini",
    color: "#8e75b2",
    dark: true,
  },
  {
    id: "qiskit",
    name: "IBM Qiskit",
    icon: "qiskit",
    color: "#ffffff",
    dark: true,
  },
  ...[
    "Groq",
    "pgvector",
    "Bull",
    "SSE",
    "Yjs",
    "CI/CD",
    "Judge0",
    "Monaco Editor",
    "Microsoft Q#",
    "Recharts",
  ].map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    color: "#f3e3c8",
    ...(name === "Yjs" ? { aliases: ["Yjs (CRDT)"] } : {}),
  })),
];
export function technologyFor(name: string): Technology | undefined {
  const key = name.trim().toLowerCase();
  return technologies.find(
    (t) =>
      t.name.toLowerCase() === key ||
      t.id === key ||
      t.aliases?.some((a) => a.toLowerCase() === key),
  );
}
export const socialIcons: Readonly<Record<string, string>> = {
  GitHub: "github",
  LinkedIn: "linkedin",
};
