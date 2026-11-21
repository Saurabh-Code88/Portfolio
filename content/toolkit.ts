export const toolkitCopy = {
  eyebrow: "Tools I build with",
  heading: "A practical backend toolkit",
  intro: "Grouped by the work they help me do, from model workflows to reliable delivery.",
  groups: [
    {
      name: "Backend and AI",
      note: "Build the product layer",
      tools: ["Node.js", "Python", "Express", "FastAPI", "LangGraph", "Groq", "Gemini"],
    },
    {
      name: "Data and retrieval",
      note: "Store, retrieve and reason",
      tools: ["PostgreSQL", "Redis", "pgvector", "Prisma"],
    },
    {
      name: "Queues and realtime",
      note: "Keep long-running work moving",
      tools: ["Bull", "Socket.io", "SSE", "Yjs", "Playwright"],
    },
    {
      name: "Product and execution",
      note: "Package and run systems",
      tools: ["React", "Docker", "Judge0", "CI/CD", "Monaco Editor"],
    },
  ],
} as const;
