import assert from "node:assert/strict";
import test from "node:test";
import { createMcpHandler } from "./mcp-handler.ts";

function makeHandler() {
  return createMcpHandler();
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
  assert.deepEqual(listed.result.tools.map(({ name }) => name), ["get_projects", "get_project", "get_experience", "get_research"]);

  const response = await modernRequest(handler, "tools/call", { name: "get_project", arguments: { slug: "ghostapply" } }, 2, "get_project");
  const result = await response.json() as { result: { content: Array<{ text: string }> } };
  assert.match(result.result.content[0].text, /GhostApply/);
  assert.match(result.result.content[0].text, /repoUrl/);
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
