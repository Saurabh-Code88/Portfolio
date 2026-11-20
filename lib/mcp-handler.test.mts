import assert from "node:assert/strict";
import test from "node:test";
import { portfolioCorpus } from "./corpus.ts";
import { createMcpHandler } from "./mcp-handler.ts";
import { MemoryRateLimiter } from "./rate-limit.ts";
import { BM25Retriever } from "./retriever.ts";
import type { AnswerProvider, AnswerMessage } from "./answer-provider.ts";

class StubProvider implements AnswerProvider {
  async *stream(messages: AnswerMessage[]) { void messages; yield "GhostApply uses React and Node.js."; }
}

function makeHandler(maxRequests = 5) {
  return createMcpHandler({
    retriever: new BM25Retriever(portfolioCorpus),
    provider: new StubProvider(),
    rateLimiter: new MemoryRateLimiter(maxRequests, 60),
  });
}

function modernRequest(handler: ReturnType<typeof createMcpHandler>, method: string, params: unknown, id = 1, name?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": method,
    "x-real-ip": "203.0.113.9",
  });
  if (name) headers.set("Mcp-Name", name);
  return handler(new Request("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: { ...(params as object), _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } } }),
  }));
}

test("MCP lists and returns project tools as read-only content", async () => {
  const handler = makeHandler();
  const list = await modernRequest(handler, "tools/list", {});
  const listed = await list.json() as { result: { tools: Array<{ name: string }> } };
  assert.deepEqual(listed.result.tools.map(({ name }) => name), ["get_projects", "get_project", "get_experience", "get_research", "ask_saurabh"]);

  const response = await modernRequest(handler, "tools/call", { name: "get_project", arguments: { slug: "ghostapply" } }, 2, "get_project");
  const result = await response.json() as { result: { content: Array<{ text: string }> } };
  assert.match(result.result.content[0].text, /GhostApply/);
  assert.match(result.result.content[0].text, /repoUrl/);
});

test("ask_saurabh uses the shared rate limiter and corpus fallback", async () => {
  const handler = makeHandler(1);
  const ask = (question: string, id: number) => modernRequest(handler, "tools/call", { name: "ask_saurabh", arguments: { question } }, id, "ask_saurabh");
  const answered = await ask("What stack does GhostApply use?", 1);
  const answer = await answered.json() as { result: { content: Array<{ text: string }> } };
  assert.match(answer.result.content[0].text, /GhostApply uses React/);
  const limited = await ask("What stack does GhostApply use?", 2);
  const denied = await limited.json() as { result: { isError: boolean } };
  assert.equal(denied.result.isError, true);
});

test("modern MCP transport rejects mismatched routing headers", async () => {
  const handler = makeHandler();
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/list" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_projects", arguments: {}, _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } } }),
  });
  assert.equal((await handler(request)).status, 400);
});
