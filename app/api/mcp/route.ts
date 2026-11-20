import { askRuntime } from "@/lib/ask-runtime";
import { createMcpHandler } from "@/lib/mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler(askRuntime);

export const POST = handler;
export function GET() {
  return new Response("This stateless MCP endpoint accepts POST requests.", { status: 405, headers: { Allow: "POST" } });
}
