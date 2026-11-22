import { certifications, education, experience } from "../content/experience.ts";
import { projects } from "../content/projects.ts";
import { research } from "../content/research.ts";

type JsonRpcRequest = { jsonrpc?: unknown; id?: string | number | null; method?: unknown; params?: unknown };
const MAX_REQUEST_BYTES = 8 * 1024;

const tools = [
  { name: "get_projects", description: "List Saurabh's portfolio projects.", inputSchema: { type: "object", additionalProperties: false, properties: {} } },
  { name: "get_project", description: "Get one project by its slug.", inputSchema: { type: "object", properties: { slug: { type: "string", description: "Project slug, such as ghostapply." } }, required: ["slug"], additionalProperties: false } },
  { name: "get_experience", description: "Get work experience, education, and certifications.", inputSchema: { type: "object", additionalProperties: false, properties: {} } },
  { name: "get_research", description: "Get research and publication details.", inputSchema: { type: "object", additionalProperties: false, properties: {} } },
] as const;

const rpc = (id: string | number | null | undefined, result: unknown) => Response.json({ jsonrpc: "2.0", id, result }, { headers: { "Cache-Control": "no-store" } });
const rpcError = (id: string | number | null | undefined, code: number, message: string, status = 200) => Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
const toolResult = (value: unknown, isError = false) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }], isError });

export function createMcpHandler() {
  return async function POST(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return new Response("Expected application/json", { status: 415 });
    const accept = request.headers.get("accept") ?? "";
    if (!accept.includes("application/json") && !accept.includes("text/event-stream")) return new Response("Accept application/json or text/event-stream", { status: 406 });

    let message: JsonRpcRequest;
    try {
      const reader = request.body?.getReader();
      if (!reader) return new Response("Missing request body", { status: 400 });
      const parts: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_REQUEST_BYTES) {
          await reader.cancel();
          return new Response("Request body is too large", { status: 413 });
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
      message = JSON.parse(new TextDecoder().decode(bytes)) as JsonRpcRequest;
    } catch { return new Response("Invalid JSON-RPC request", { status: 400 }); }

    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return rpcError(message?.id, -32600, "Invalid Request");
    const id = message.id;
    if (id === undefined) return new Response(null, { status: 202 });

    const protocolVersion = request.headers.get("mcp-protocol-version");
    const modern = protocolVersion === "2026-07-28";
    if (protocolVersion && protocolVersion !== "2026-07-28" && protocolVersion !== "2025-11-25") {
      return rpcError(id, -32022, "Unsupported protocol version. Supported versions: 2026-07-28, 2025-11-25.", 400);
    }
    if (modern) {
      const params = message.params && typeof message.params === "object" ? message.params as Record<string, unknown> : {};
      const meta = params._meta && typeof params._meta === "object" ? params._meta as Record<string, unknown> : {};
      if (request.headers.get("mcp-method") !== message.method || meta["io.modelcontextprotocol/protocolVersion"] !== protocolVersion) {
        return rpcError(id, -32020, "Header mismatch: MCP request metadata does not match the request.", 400);
      }
      if (message.method === "tools/call") {
        const name = params.name;
        if (typeof name !== "string" || request.headers.get("mcp-name") !== name) return rpcError(id, -32020, "Header mismatch: Mcp-Name does not match params.name.", 400);
      }
    } else if (!protocolVersion && message.method !== "initialize") {
      return rpcError(id, -32022, "A supported MCP-Protocol-Version header is required.", 400);
    }

    if (message.method === "initialize") {
      return rpc(id, {
        protocolVersion: protocolVersion ?? "2025-11-25",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "saurabh-portfolio", version: "1.0.0" },
        instructions: "Read-only portfolio tools for Saurabh Pramanik.",
      });
    }
    if (message.method === "ping") return rpc(id, {});
    if (message.method === "tools/list") return rpc(id, { tools });
    if (message.method !== "tools/call") return rpcError(id, -32601, "Method not found", modern ? 404 : 200);

    if (!message.params || typeof message.params !== "object") return rpcError(id, -32602, "Invalid params");
    const { name, arguments: args = {} } = message.params as { name?: unknown; arguments?: unknown };
    if (typeof name !== "string" || !args || typeof args !== "object" || Array.isArray(args)) return rpcError(id, -32602, "Invalid params");
    const input = args as Record<string, unknown>;

    if (name === "get_projects") return rpc(id, toolResult(projects));
    if (name === "get_project") {
      if (typeof input.slug !== "string") return rpc(id, toolResult("Provide a project slug.", true));
      const project = projects.find(({ slug }) => slug === input.slug);
      return rpc(id, project ? toolResult(project) : toolResult(`No project found with slug '${input.slug}'.`, true));
    }
    if (name === "get_experience") return rpc(id, toolResult({ experience, education, certifications }));
    if (name === "get_research") return rpc(id, toolResult(research));
    return rpc(id, toolResult(`Unknown tool '${name}'.`, true));
  };
}
