export type Project = {
  slug: string;
  title: string;
  oneLiner: string;
  problem: string;
  architecture: string;
  stack: string[];
  highlights: string[];
  metric: { label: string; value: string } | null;
  repoUrl: string;
  liveUrl: string | null;
};

export const projectsCopy = {
  listingIntro: "Selected backend and AI systems work.",
  highlightsHeading: "Highlights",
  metricHeading: "Metric",
  noResultNote: "No measured result provided yet.",
  pipelineQueueLabel: "Bull / Redis queue · failed steps can continue",
  nodes: {
    support: ["Gemini", "Groq", "Policy engine", "Human approval"],
    ghostapply: ["Hunt", "Match", "Research", "Outreach"],
    kritique: ["Client", "API + queue", "LLM review", "SSE results"],
    collabcode: ["Editor clients", "Yjs CRDT", "Socket.io", "Judge0"],
    urlShortener: ["Client", "API + rate limit", "Redis cache", "PostgreSQL"],
  },
  nodeDescriptions: {
    support: ["Decides", "Classifies and drafts", "Enforces rules", "Reviews risky actions"],
    ghostapply: ["Finds roles", "Scores fit", "Researches roles", "Prepares outreach"],
    kritique: ["Starts a review", "Bull / Redis jobs", "Reviews code", "Streams the result"],
    collabcode: ["Shared editing", "Conflict-free changes", "WebSocket transport", "Runs code"],
    urlShortener: ["Short-link request", "Rate limiting", "Cache-first read", "Persistent records"],
  },
  diagramNotes: {
    support: "Deterministic policy · human approval",
    ghostapply: "Bull / Redis queue · failed steps can continue",
    kritique: "Circuit breaker · Redis fallback",
    collabcode: "Judge0 supports execution in multiple languages",
    urlShortener: "Redis write-through · stateless API",
  },
} as const;

export const projects: Project[] = [
  {
    slug: "support-resolution-agent",
    title: "Support resolution agent",
    oneLiner: "A support resolution workflow with deterministic policies and human approval.",
    problem:
      "Customer support resolution needs policy enforcement and human review for risky actions.",
    architecture:
      "LangGraph workflow where Gemini decides, Groq classifies and drafts replies, a deterministic policy engine enforces rules, and a human approves risky actions. Diagram: support-resolution-agent.",
    stack: ["Python", "FastAPI", "LangGraph", "Gemini", "Groq"],
    highlights: [
      "Deterministic policy engine",
      "Human approval step",
      "Offline tests",
      "19-ticket eval suite",
      "Demo UI",
    ],
    metric: null,
    repoUrl: "https://github.com/Saurabh-Code88/AI-customer-support",
    liveUrl: null,
  },
  {
    slug: "ghostapply",
    title: "GhostApply: agentic job search engine",
    oneLiner: "An agentic job search engine built around a fault-tolerant four-stage pipeline.",
    problem:
      "Job search moves through Hunt, Match, Research and Outreach stages, with human approval and fault-tolerant steps.",
    architecture:
      "Asynchronous four-stage pipeline (Hunt, Match, Research, Outreach) on Bull/Redis queues with human-in-the-loop approval; a failed or malformed step does not stop the pipeline. Diagram: ghostapply-pipeline.",
    stack: ["React", "Node.js", "PostgreSQL", "pgvector", "Redis", "Bull", "Playwright", "Docker"],
    highlights: [
      "pgvector similarity combined with LLM reasoning for matching",
      "MCP server exposing tools such as score_job_fit and draft_cover_letter",
      "JWT authentication",
      "CI/CD",
    ],
    metric: null,
    repoUrl: "https://github.com/Saurabh-Code88/GhostApply",
    liveUrl: null,
  },
  {
    slug: "kritique",
    title: "Kritique: AI code review",
    oneLiner: "An asynchronous AI code review service that streams results to the client.",
    problem:
      "LLM inference time can exceed API response time, so review jobs run asynchronously and stream results over SSE.",
    architecture:
      "API enqueues review jobs on Bull/Redis so API latency is decoupled from LLM inference time; results stream to the client over SSE; a circuit breaker with Redis fallback handles upstream outages. Diagram: kritique-review-flow.",
    stack: ["Node.js", "Express", "React", "PostgreSQL", "Prisma", "Redis", "Bull", "SSE", "Docker"],
    highlights: [
      "10 languages",
      "Severity-classified feedback",
      "Persistent review history",
      "20 concurrent review jobs without request drops",
    ],
    metric: {
      label: "First token and perceived latency",
      value: "First token in 800 ms vs. 8–12 s for a full response (about 70% lower perceived latency)",
    },
    repoUrl: "https://github.com/Saurabh-Code88/KRITIQUE",
    liveUrl: null,
  },
  {
    slug: "collabcode",
    title: "CollabCode: real-time collaborative editor",
    oneLiner: "A real-time collaborative editor with conflict-free shared editing and code execution.",
    problem:
      "Multiple clients need conflict-free shared edits over WebSockets, with code execution in multiple languages.",
    architecture:
      "Yjs CRDT keeps edits conflict-free across clients over WebSockets; Judge0 executes code in multiple languages. Diagram: collabcode-realtime-editing.",
    stack: ["Yjs (CRDT)", "Socket.io", "Monaco Editor", "Judge0", "Groq"],
    highlights: ["Presence awareness", "Personal and Interview modes", "AI hints"],
    metric: null,
    repoUrl: "https://github.com/Saurabh-Code88/collab-code",
    liveUrl: null,
  },
  {
    slug: "distributed-url-shortener",
    title: "Distributed URL shortener",
    oneLiner: "A distributed URL shortener with cache-first reads and a stateless design.",
    problem:
      "Short-link reads use a cache-first path, with IP-based rate limiting and stateless horizontal scaling.",
    architecture:
      "Cache-first reads with Redis write-through, IP-based rate limiting, stateless design for horizontal scaling. Diagram: url-shortener-cache-flow.",
    stack: ["Node.js", "PostgreSQL", "Redis", "Prisma"],
    highlights: [],
    metric: null,
    repoUrl: "https://github.com/Saurabh-Code88/Distributed-URL-shortner",
    liveUrl: null,
  },
];
