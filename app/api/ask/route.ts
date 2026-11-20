import { createAskHandler } from "@/lib/ask-handler";
import { askRuntime } from "@/lib/ask-runtime";

export const runtime = "nodejs";

const handler = createAskHandler(askRuntime);

export const POST = handler;
