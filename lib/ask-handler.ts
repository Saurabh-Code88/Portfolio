import { askCopy } from "../content/ask.ts";
import { ASK_LIMITS } from "./ask-config.ts";
import type { AnswerProvider } from "./answer-provider.ts";
import { buildGroqMessages } from "./groq-provider.ts";
import type { RateLimiter } from "./rate-limit.ts";
import { hashClientIp } from "./rate-limit.ts";
import type { Retriever } from "./retriever.ts";

const json = (body: unknown, status: number, headers?: HeadersInit) => Response.json(body, { status, headers });
const sseHeaders = { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Content-Type-Options": "nosniff" };

function textStream(text: string): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(controller) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\ndata: [DONE]\n\n`));
    controller.close();
  } }), { headers: sseHeaders });
}

export function createAskHandler(deps: { retriever: Retriever; provider: AnswerProvider; rateLimiter: RateLimiter }) {
  return async function POST(request: Request): Promise<Response> {
    let body: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: askCopy.invalidQuestion }, 400);
      const parts: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > ASK_LIMITS.bodyBytes) {
          await reader.cancel();
          return json({ error: askCopy.tooLong }, 413);
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
      body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch { return json({ error: askCopy.invalidQuestion }, 400); }
    if (!body || typeof body !== "object" || !("question" in body)) return json({ error: askCopy.missingQuestion }, 400);
    const question = (body as { question?: unknown }).question;
    if (typeof question !== "string") return json({ error: askCopy.invalidQuestion }, 400);
    if (!question.trim()) return json({ error: askCopy.missingQuestion }, 400);
    if (question.length > ASK_LIMITS.inputCharacters) return json({ error: askCopy.tooLong }, 413);

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = request.headers.get("x-real-ip") ?? forwardedFor?.split(",")[0]?.trim() ?? "unknown";
    let limit: Awaited<ReturnType<RateLimiter["limit"]>>;
    try { limit = await deps.rateLimiter.limit(hashClientIp(ip)); }
    catch { return json({ error: askCopy.serviceUnavailable }, 503); }
    if (!limit.allowed) return json({ error: askCopy.rateLimited }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

    const chunks = deps.retriever.retrieve(question, ASK_LIMITS.topK);
    if (!chunks.length) return textStream(askCopy.fallback);

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), { once: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const token of deps.provider.stream(buildGroqMessages(question, chunks), ASK_LIMITS.outputTokens, abortController.signal)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          if (!abortController.signal.aborted) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: askCopy.serviceUnavailable })}\n\ndata: [DONE]\n\n`));
            controller.close();
          }
        }
      },
      cancel() { abortController.abort(); },
    });
    return new Response(stream, { headers: sseHeaders });
  };
}
