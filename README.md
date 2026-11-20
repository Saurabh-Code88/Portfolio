# Saurabh Pramanik portfolio

Portfolio site and a read-only Model Context Protocol (MCP) server at
`/api/mcp`.

## MCP endpoint

The endpoint uses stateless Streamable HTTP. It exposes these read-only tools:

- `get_projects` lists project content.
- `get_project` accepts a project `slug`.
- `get_experience` returns work experience, education, and certifications.
- `get_research` returns publication details.
- `ask_saurabh` accepts a `question` and answers from the portfolio corpus.

Example remote MCP client configuration (replace the URL with the deployed
site URL):

```json
{
  "mcpServers": {
    "saurabh-portfolio": {
      "url": "https://your-domain.example/api/mcp"
    }
  }
}
```

The read tools return the typed content from `content/`. `ask_saurabh` uses the
same corpus, BM25 retriever, Groq provider, and per-IP limiter as `/api/ask`.
It returns a Contact fallback when no portfolio content matches. Configure
`GROQ_API_KEY` to enable generated answers. Configure both
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared rate limits;
development uses an in-memory limiter.

## Development

```sh
npm install
npm run dev
```

Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` to
check the project. `npm run check:lighthouse` builds and serves the production
output, then checks the home, projects, and GhostApply detail pages on desktop.
The Lighthouse CI config fails if any audited page scores below 90 in
performance, accessibility, best practices, or SEO; reports are written to the
ignored `.lighthouseci/` folder.

## Vercel deployment preparation

The project uses Next.js App Router defaults; Vercel detects the framework and
uses `npm run build`. Connect the GitHub repository
[`Saurabh-Code88/Portfolio`](https://github.com/Saurabh-Code88/Portfolio) to a
Vercel project, set the environment variables below in the Vercel project
settings, and run a preview build before promoting it. The app has not been
deployed as part of this change.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes for generated answers | Server-side Groq key used by `/api/ask` and `ask_saurabh`. |
| `UPSTASH_REDIS_REST_URL` | Yes in production | Upstash Redis REST endpoint for the per-IP limiter. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes in production | Upstash Redis REST token; keep it server-side. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public production origin (for example, `https://portfolio.example`) used by metadata, sitemap, and robots. |

Add secret values in Vercel's Environment Variables settings for Production
and Preview as appropriate. Only `NEXT_PUBLIC_SITE_URL` is public; do not use a
`NEXT_PUBLIC_` prefix for API keys or tokens. Set `NEXT_PUBLIC_SITE_URL` to the
production domain for production and the preview origin for previews. The app
can use Vercel's project production URL when the variable is absent and Vercel
system environment variables are enabled. For local development, copy
`.env.example` to `.env.local` and fill in the values; the local development
rate limiter works without Upstash.
