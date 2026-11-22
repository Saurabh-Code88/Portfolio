# AGENTS.md: Saurabh Pramanik portfolio

## What this is
A personal portfolio that positions Saurabh as a **backend developer who builds the systems AI agents run on** (queues, retrieval, streaming, fault tolerance). Theme: original space artwork, amber on dark, with restrained ion-blue HUD accents.

Audience: hiring managers and engineers skimming for 60 seconds. Primary job of the site: make them open a repo, try a live demo, or get in touch.

## Hard rules
1. **Original space assets only.** Do not use film, game, or third-party character art, logos, or quotes. Build artwork with original SVG and CSS (stars, orbit rings, simple spacecraft, and interface marks).
2. **Keep content in the DOM.** Headings, copy, controls, and interactive content must remain semantic HTML and accessible when decorative artwork is disabled.
3. **3D canvas is a background layer.** Keep it behind DOM content, decorative, non-interactive, and performance/accessibility safe.
4. **No fabricated numbers.** Metrics come only from `content/projects.ts`. If a value is `null`, render nothing or a "Demo coming soon" state. Never invent stats.
5. **Placeholders for live links.** `liveUrl: null` renders a disabled "Demo coming soon" button, not a broken link.
6. **Secrets stay server-side.** Never expose secrets to the client. Commit `.env.example` only.
7. **Small, reviewable changes.** One phase at a time. Run lint, typecheck, test, and build before saying a phase is done.
8. **Accessibility floor:** keyboard focus visible, `prefers-reduced-motion` respected, contrast AA on amber-on-dark, semantic headings, alt text on meaningful SVGs, and usable mobile navigation.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Framer Motion for user-triggered interactions; keep ambient motion subtle and reduced-motion safe
- Read-only MCP endpoint at `/api/mcp`
- Deploy: Vercel

## Design tokens
Colors are defined as CSS variables and referenced via the Tailwind theme:

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#05070a` | page background |
| `--surface` | `#101820` | panels and surfaces |
| `--surface-2` | `#182635` | hover/raised surfaces |
| `--amber` | `#e8a045` | primary accent, headings, key links |
| `--rust` | `#c47a20` | borders, secondary accent |
| `--ember` | `#7a3d00` | muted lines, disabled states |
| `--ink` | `#f3e3c8` | body text (warm off-white) |
| `--ion` | `#6cb8ff` | sparse HUD accents |

Type:
- Display: **Chakra Petch** for headings
- Body: **IBM Plex Sans**
- Code and metrics: **Fira Code**
- Body line length under 75 characters; headings get generous line-height

## Design principles
- The hero uses a subtle two-layer starfield, a ship on the right, clear calls to action, content-sourced proof points, and a "Fly to" station bar. Keep a soft left scrim behind text.
- The 3D canvas is decorative background artwork. Keep all content, controls, and readable information in the DOM above it. Station links follow the scroll flight; reduced-motion users jump directly to each section.
- Sections use consistent panel spacing and radius. Avoid gradient washes and identical-card grids for everything.
- Project pages show **architecture first** (a diagram), then the problem, then the result. Numbers appear as plain text with a label, not oversized stat blocks.
- Numbered markers only where order is real (e.g. GhostApply pipeline stages).
- Sentence case everywhere. No all-caps eyebrow labels. Use active, plain copy.
- Respect `prefers-reduced-motion`; use motion only for the starfield and user-triggered interactions.

## Content model
All copy lives in `content/` as typed data. Components render from it; they never hardcode copy.

```ts
type Project = {
  slug: string;
  title: string;
  oneLiner: string;
  problem: string;
  architecture: string;       // sentence + diagram id
  stack: string[];
  highlights: string[];
  metric: { label: string; value: string } | null;
  repoUrl: string;
  liveUrl: string | null;     // null => "Demo coming soon"
};
```

Files: `content/profile.ts`, `content/projects.ts`, `content/experience.ts`, `content/research.ts`.

## Site structure
Current homepage order:
1. Hero (starfield, ship, positioning line, calls to action, station links)
2. Toolkit
3. Projects (support agent, GhostApply, Kritique, CollabCode, URL shortener, in that order)
4. Research (QENN paper)
5. Experience and education (About)
6. Contact (email, GitHub, LinkedIn, X, LeetCode, resume download)

## Positioning copy
- Headline: **I build the backend systems AI agents run on.**
- Subline: Queues, retrieval, streaming and fault tolerance for LLM products. Node.js, Python, Redis, PostgreSQL.

## Definition of done (per phase)
`npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all pass; the page works at 375px and 1280px; no console errors.

## Working rules for agents (context discipline)
- One task per session. Do only the step you are given, then stop.
- Start by reading PROGRESS.md and this file only. Do not re-audit the repo or read docs/.
- Never open or print: node_modules, .next, package-lock.json, *.glb, images, public/models, assets-src. Search with rg first, then read only the lines you need.
- Keep command output short (tail -n 30). Run lint, typecheck and build once at the end, not after every edit.
- Do not paste whole files into the chat. Describe changes briefly.
- Commit after each completed step. Before stopping, rewrite PROGRESS.md (done, next, decisions, constants to tune) in under 20 lines.
- If the session is getting long, stop at a clean point: commit, update PROGRESS.md, and tell me to start a fresh session.
