import { portfolioCorpus } from "./corpus";
import { GroqProvider } from "./groq-provider";
import { createRateLimiter } from "./rate-limit";
import { BM25Retriever } from "./retriever";

const createAskRuntime = () => ({
  corpus: portfolioCorpus,
  retriever: new BM25Retriever(portfolioCorpus),
  provider: new GroqProvider(),
  rateLimiter: createRateLimiter(),
});

type AskRuntime = ReturnType<typeof createAskRuntime>;

declare global {
  // Keep the in-memory development limiter shared across Next.js route bundles.
  var __portfolioAskRuntime: AskRuntime | undefined;
}

export const askRuntime = globalThis.__portfolioAskRuntime ??= createAskRuntime();
