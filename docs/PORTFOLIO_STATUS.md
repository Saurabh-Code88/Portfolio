# Portfolio repository audit

Audit date: 2026-11-22  
Repository: `Saurabh-Code88/Portfolio`  
Audited commit: `2656506` (`Add pointer-reactive dragon motion`)

## 1. Tech stack

| Area | Current implementation |
| --- | --- |
| Framework | Next.js 15.5.29, App Router. The dependency range in `package.json` is `^15.5.6`. |
| UI / language | React 19.3.1, TypeScript 5.9.3 with `strict: true`; JSX uses the Next.js App Router. |
| Build | Next.js CLI (`next dev`, `next build`, `next start`); no separate Vite, CRA, Astro, or custom bundler configuration. |
| Package manager | npm, indicated by `package-lock.json`. No Node.js version is pinned in the repository. |
| Styling | Tailwind CSS 4.3.5 is imported through `@import "tailwindcss"` and configured with `@theme inline` in `app/globals.css`. Most site components use named classes from that global stylesheet; the token reference page also uses Tailwind utilities. There are no CSS Modules or styled-components. |
| Motion | Framer Motion 12.43.0 is used by the hero for the scroll unroll. Pointer-reactive dragon movement and tool-chip hover motion use CSS/custom properties. There is no GSAP or scroll-animation library. |
| Canvas / 3D | No Three.js, `<canvas>`, WebGL, or shader implementation exists in the application source or dependencies. The illustrations are inline SVG/CSS. |
| Backend | Next.js route handlers at `/api/ask` and `/api/mcp`; no separate backend service or database. Ask answers use a BM25 retriever behind a `Retriever` interface and a Groq provider behind an `AnswerProvider` interface. |
| Deployment | Vercel is the documented target in `README.md`. `next.config.ts` only sets `outputFileTracingRoot`; there is no `vercel.json`, Dockerfile, or repository CI workflow. A Vercel project/deployment connection cannot be verified from the repository. |

Installed versions were read from `npm ls`; ranges are in `package.json` and exact resolutions in `package-lock.json`.

### API and environment

- `POST /api/ask`: JSON question input, 1,000-character limit, 8 KiB request-body limit, top four BM25 chunks, 350 maximum generated output tokens, and five requests per 60 seconds per hashed client IP. The answer streams as SSE. Out-of-scope questions get the Contact fallback without calling Groq.
- `POST /api/mcp`: stateless JSON-RPC / Streamable HTTP endpoint with `get_projects`, `get_project`, `get_experience`, `get_research`, and `ask_saurabh`. The ask tool reuses the corpus, Groq provider, and rate limiter. Cross-origin `Origin` values are rejected when present; GET is not supported.
- Environment variable names found in `.env.example` and source: `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, and `NODE_ENV`. No values are included here.
- Upstash is used when both Redis variables exist. Development falls back to an in-memory limiter; production without those values uses an unavailable limiter and requests fail with a service-unavailable response.
- `lib/site-url.ts` uses `NEXT_PUBLIC_SITE_URL`, then Vercel-provided URL variables, then `http://localhost:3000`.
- The LLM system prompt and provider use `GROQ_API_KEY` server-side. The rate-limit key hashes the client IP; no visitor logging was found in the API source.

## 2. Design pattern and structure

### Folders

```text
app/                 App Router pages, metadata routes, API handlers, global CSS
  api/ask/            Ask SSE route
  api/mcp/             MCP route
  dev/tokens/          Token reference page
  projects/            Project index and [slug] detail route
components/            Navigation, hero, section renderers, diagrams, project actions
content/               Typed profile, project, toolkit, research, experience, and UI copy
lib/                   Corpus, BM25 retriever, provider, rate limiter, route handlers, site URL
public/                Public resume placeholder
docs/                  Audit report (this file)
```

Root configuration includes `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, and `lighthouserc.json`.

### Theme and layout

- CSS variables in `app/globals.css` define `--bg`, `--surface`, `--surface-2`, `--amber`, `--rust`, `--ember`, `--ink`, `--ink-muted`, and `--line`. Tailwind v4 maps the color and font variables through `@theme inline`; no `tailwind.config.*` file is used.
- Roughly **4 application files contain explicit color values**: `app/globals.css`, `app/opengraph-image.tsx`, `app/icon.svg`, and `app/dev/tokens/page.tsx`. The global stylesheet also contains raw RGB alpha values derived from the palette. Roughly **3 application files contain font names or font declarations**: `app/layout.tsx`, `app/globals.css`, and `app/dev/tokens/page.tsx`. These counts exclude `AGENTS.md` and generated output.
- `next/font/google` loads Shippori Mincho, IBM Plex Sans, and Fira Code in `app/layout.tsx`. There are no font files in `public/`.
- The home page is a vertically scrolling single page. `SiteNav` is sticky and links to the home-page anchors; it is also rendered on the project and token routes. No full-page scroll container or scroll library was found.
- Layering uses a fixed CSS grid pseudo-element (`body::before`, `z-index: -1`), a sticky header (`z-index: 10`), the skip link (`z-index: 20`), and hero SVG art inside an isolated/clipped scroll panel. There is no full-screen background canvas.
- Project diagrams are SVG regions with a focusable horizontal scroll wrapper. They have a 760px minimum diagram width, so narrow screens must horizontally scroll them.

### Assets

| Asset | Size | Notes |
| --- | ---: | --- |
| `app/icon.svg` | 560 bytes | Original scroll/dragon favicon artwork. |
| `public/resume.pdf` | 628 bytes | PDF explicitly says “Resume placeholder - replace with the current resume.” It is not a real resume. |
| Hero dragon scroll | Inline SVG in `components/hero.tsx` | Original artwork, no standalone image asset. |
| Project architecture diagrams | Inline SVG in `components/architecture-diagram.tsx` | Rendered from project data. |
| Open Graph image | Generated by `app/opengraph-image.tsx` | Generated from original SVG/HTML artwork; no checked-in bitmap. |

There are no GIFs, video files, raster portfolio images, or external image assets in `app/` or `public/`. I did not find suspected third-party character art in the repository. The repository guidance explicitly prohibits official Kung Fu Panda assets.

## 3. Contents

Most visible portfolio copy and structured content is in typed files under `content/`; components render it. Navigation labels and a few accessibility/UI strings are directly in component/layout JSX. There is no CMS.

### Global navigation

`components/site-nav.tsx` renders the name/monogram and links: **Work** (`/#projects`), **Toolkit** (`/#toolkit`), **Research** (`/#research`), **About** (`/#experience`), and **Let’s talk** (`/#contact`). At widths up to 600px, the Research and About nav links are hidden; their page sections remain in the scroll flow.

### Home page sections, in order

| Section / ID | Renderer | Purpose and copy |
| --- | --- | --- |
| Hero / heading `hero-heading` (no section `id`) | `components/hero.tsx` | Kicker: “Saurabh Pramanik · Backend developer.” Headline: “I build the backend systems AI agents run on.” Subline: “Queues, retrieval, streaming and fault tolerance for LLM products. Node.js, Python, Redis, PostgreSQL.” Ask form label: “Ask the Dragon Scroll”; placeholder asks about projects, research, or experience. The answer status says answers use site portfolio details. The response streams into the page. Profile copy is in `content/profile.ts`; ask/status messages and limits are in `content/ask.ts` and `lib/ask-config.ts`. |
| Toolkit / `toolkit` | `components/toolkit-section.tsx` | Heading “A practical backend toolkit”; intro groups tools by task. Groups: Backend and AI (Node.js, Python, Express, FastAPI, LangGraph, Groq, Gemini); Data and retrieval (PostgreSQL, Redis, pgvector, Prisma); Queues and realtime (Bull, Socket.io, SSE, Yjs, Playwright); Product and execution (React, Docker, Judge0, CI/CD, Monaco Editor). Data is in `content/toolkit.ts`. |
| Projects / `projects` | `components/projects-section.tsx` | Eyebrow “Selected work”; heading “Projects”; intro “Selected backend and AI systems work.” Five projects appear in display order below. Each card contains a diagram, one-liner, repo link, and disabled “Demo coming soon” control because each `liveUrl` is `null`. Content and diagram labels are in `content/projects.ts`; links/actions are rendered by `components/project-actions.tsx`. |
| Research / `research` | `components/research-section.tsx` | “Cross-stack reproduction of a Quantum Elman Neural Network”; summary says it is for stock closing-price prediction; “Accepted at Elsevier ICMLDE 5.0, 2026.” Finding: the classical Elman baseline beat both quantum reproductions on all six global indices; equivalent amplitude encoding across Qiskit and Q# did not yield equivalent optimization trajectories. Tech: IBM Qiskit, Microsoft Q#, React, Recharts. Co-authors: Yashraj Jadam and Pavitra Sharma. Advisor: Dr. Himanshu Agrawal, JIIT Noida. Data is in `content/research.ts`. |
| Experience / `experience` | `components/experience-section.tsx` | Backend Developer Intern, Unified Mentor Pvt Ltd, July–December 2025. Highlights: built 30+ modular Node.js/Express backend components; built/integrated database-backed REST APIs and refactored server architecture for reuse/scalability. A visible note says the dates need confirmation against LinkedIn. Education: B.Tech Computer Science, Jaypee Institute of Information Technology, Noida, 2022–2026. Certifications: GitHub Foundations (GitHub, 2026); Data Analytics with Python (NPTEL, IIT Roorkee, 2026). Data is in `content/experience.ts`. |
| Contact / `contact` | `components/contact-section.tsx` | Heading “Contact”; prompt “Get in touch or explore the work”; location “Noida, India.” Links: Email (`saurabh.work85@gmail.com`), GitHub (`Saurabh-Code88`), LinkedIn (`saurabh-pramanik`), X (`pramanik_codes`), LeetCode (`PRAMANIKSAURABH`), and Download resume (`/resume.pdf`). Link data is in `content/profile.ts`; labels are in the component. |

### Project content

All five records use the typed `Project` model in `content/projects.ts`. Detail pages are generated at build time from each slug in `app/projects/[slug]/page.tsx`. Each detail page orders content **Architecture → Problem → Result → Stack**. Results show highlights and any metric; projects with neither show “No measured result provided yet.”

| Project | Summary, problem, architecture, result, stack, link |
| --- | --- |
| **Support resolution agent** (`support-resolution-agent`) | One-liner: a support-resolution workflow with deterministic policies and human approval. Problem: support actions need policy enforcement and human review for risky actions. Architecture: LangGraph, Gemini decisions, Groq classification/drafting, deterministic policy, human approval. Highlights: deterministic policy engine, human approval, offline tests, 19-ticket eval suite, demo UI; metric is `null`. Stack: Python, FastAPI, LangGraph, Gemini, Groq. [Repo](https://github.com/Saurabh-Code88/AI-customer-support); live demo `null`. |
| **GhostApply: agentic job search engine** (`ghostapply`) | One-liner: fault-tolerant four-stage job-search pipeline. Stages: Hunt, Match, Research, Outreach. Architecture: async Bull/Redis queues, human approval, failed/malformed steps do not halt the pipeline. Highlights: pgvector similarity + LLM reasoning; MCP tools `score_job_fit` and `draft_cover_letter`; JWT auth; CI/CD; metric `null`. Stack: React, Node.js, PostgreSQL, pgvector, Redis, Bull, Playwright, Docker. [Repo](https://github.com/Saurabh-Code88/GhostApply); live demo `null`. |
| **Kritique: AI code review** (`kritique`) | One-liner: asynchronous AI code review streaming results to the client. Architecture: Bull/Redis jobs decouple API latency from LLM inference; SSE streams results; circuit breaker with Redis fallback handles upstream outages. Highlights: 10 languages, severity-classified feedback, persistent review history, 20 concurrent jobs without request drops. Metric: “First token in 800 ms vs. 8–12 s for a full response (about 70% lower perceived latency).” Stack: Node.js, Express, React, PostgreSQL, Prisma, Redis, Bull, SSE, Docker. [Repo](https://github.com/Saurabh-Code88/KRITIQUE); live demo `null`. |
| **CollabCode: real-time collaborative editor** (`collabcode`) | One-liner: collaborative editor with conflict-free editing and code execution. Architecture: Yjs CRDT over WebSockets; Judge0 runs code in multiple languages. Highlights: presence awareness, Personal and Interview modes, AI hints; metric `null`. Stack: Yjs (CRDT), Socket.io, Monaco Editor, Judge0, Groq. [Repo](https://github.com/Saurabh-Code88/collab-code); live demo `null`. |
| **Distributed URL shortener** (`distributed-url-shortener`) | One-liner: cache-first, stateless URL shortener. Architecture: Redis write-through, IP rate limiting, horizontal scaling. No highlights or metric; detail page displays “No measured result provided yet.” Stack: Node.js, PostgreSQL, Redis, Prisma. [Repo](https://github.com/Saurabh-Code88/Distributed-URL-shortner); live demo `null`. |

### Other route

`/projects` renders the same five projects as the page’s H1-level project listing. `/dev/tokens` is a development reference page showing all seven base palette values and typography examples. Sitemap includes `/`, `/projects`, and all five project detail routes; `/dev/` and `/api/` are disallowed in `app/robots.ts`.

### Outdated, inconsistent, or placeholder content

- `public/resume.pdf` is explicitly a placeholder, despite being linked as a resume download.
- Experience dates have a visible “Dates need confirmation against LinkedIn” note.
- Kritique’s metric combines first-token latency (800 ms), full-response time (8–12 s), and “about 70% lower perceived latency.” The comparison basis is not included, so the relationship between those numbers needs source/definition confirmation.
- Every project has `liveUrl: null`; no live demos are linked. The URL shortener has no highlights or metric, and its detail result is therefore a placeholder message.
- `AGENTS.md` describes a separate “Under the hood” section and puts Projects immediately after the hero. The current homepage instead places Toolkit before Projects and places architecture diagrams inside project cards/details; there is no standalone Under the hood section.
- The chat guidance allows “project README summaries,” but the current `lib/corpus.ts` builds its corpus from typed content files and does not ingest README files.
- README deployment notes describe preparation and say the app has not been deployed as part of the change. That sentence may no longer describe the live Vercel state; the repository alone does not confirm deployment.

## 4. Quality baseline

### Checks run on this audit

| Check | Result |
| --- | --- |
| `npm run lint` | Passed. |
| `npm run typecheck -- --incremental false` | Passed. |
| `npm run test` | Passed: 8 tests, 0 failures. |
| `npm run build` (via `npm run check:lighthouse`) | Passed. Next.js generated static project routes and dynamic API routes successfully. |
| `npm run check:lighthouse` | Build passed, but the first Lighthouse run remained at “Run #1” for over two minutes without producing a report. I stopped that stalled audit; fresh category scores for this commit are unavailable. |

The project has unit tests in `content/projects.test.mts`, `lib/ask-handler.test.mts`, and `lib/mcp-handler.test.mts`. Coverage includes required repo URLs/non-empty metrics, rate limiting, out-of-scope fallback, prompt-injection handling, MCP tool listing/read methods, shared ask limiting, and MCP header validation. There are no browser interaction, visual regression, or automated accessibility tests.

The build reports `/` at **45.2 kB route JS / 151 kB first-load JS**, with **103 kB shared JS**. `/projects` and `/projects/[slug]` are about **106 kB first load**. These are Next build route-size figures, not a full transferred-network or runtime memory profile.

`lighthouserc.json` audits desktop `/`, `/projects`, and `/projects/ghostapply`, with thresholds of 90 for performance, accessibility, best practices, and SEO, plus a console-error assertion. Existing saved reports are dated **2026-11-20**, before commits `7afe91b` and `2656506`; they show home **99/100/100/100** and Projects/GhostApply **100/100/100/100** in performance/accessibility/best practices/SEO. Treat those as historical results, not proof that the current commit meets the target.

### Accessibility, SEO, performance, and responsive notes

- Implemented: skip link, global `:focus-visible` outline, semantic headings/regions, labeled ask input, reduced-motion CSS and reduced-motion handling for the hero, descriptive title/description, Open Graph/Twitter metadata, generated original OG artwork, `sitemap.xml`, and `robots.txt`.
- Meaningful hero SVG has `<title>`/`<desc>`; architecture SVGs have accessible labels and focusable horizontal scroll wrappers. The tool glyphs are hidden from assistive tech because their visible text labels identify the tools.
- The ask answer is updated as streaming text inside an `aria-live="polite"` paragraph; token-by-token updates may be verbose for some screen-reader users.
- Mobile CSS switches toolkit groups and experience/research layouts to one column; the hero uses a 720px minimum height at narrow widths. Project diagrams remain wider than the viewport and are horizontally scrollable. On small screens, Research/About are omitted from the sticky navigation.
- SEO is present, but there is no explicit canonical URL field. `siteUrl` can fall back to localhost if neither configured nor Vercel system URL variables are available; `NEXT_PUBLIC_SITE_URL` should be set for production metadata/sitemap consistency.
- No large static media or animation package beyond Framer Motion was found. Main JS includes the Next/React shared runtime and the client-side hero. A current Lighthouse check did not complete, so no fresh performance or accessibility score is asserted.

## 5. Theme-change feasibility

**Effort: low to moderate.** The seven core colors and font variables are centrally defined and mapped into Tailwind, so changing the main palette and typefaces starts in `app/globals.css` and `app/layout.tsx`. For a complete swap, also update the hardcoded alpha-color RGB values in the stylesheet, the design-token examples in `app/dev/tokens/page.tsx`, the generated OG palette in `app/opengraph-image.tsx`, and the favicon in `app/icon.svg`. Most hero and diagram strokes/fills already use CSS variables.

A fixed full-screen background canvas would not conflict with an existing canvas or WebGL scene because none is present. It would share the page with the existing fixed CSS grid, sticky header, skip link, clipped/isolation-based hero art, and horizontally scrollable diagrams. Its stacking context and pointer-event behavior would need to keep links, the ask form, keyboard focus, and the dragon pointer interaction usable; the Lighthouse run should also be repeated to measure its performance cost.

## Risks and open questions

- Replace the placeholder resume PDF before treating the contact section as production-ready.
- Confirm internship dates and the source/definition for the Kritique latency comparison.
- Provide live demo URLs or explicitly retain the current “Demo coming soon” state.
- Decide whether corpus answers should include project README summaries, as the written chat rule says.
- Set and verify production `NEXT_PUBLIC_SITE_URL`, Groq, and Upstash values in Vercel; the repository does not establish the current deployment state.
- Pin or document the supported Node.js version.
- Re-run Lighthouse CI after the current commit; the historical reports predate the latest design/motion commits, and the fresh audit stalled in this environment.
