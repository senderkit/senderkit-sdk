import { contextInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(contextInput);

export interface SenderKitContext {
  /** Active mode for this connection. */
  mode: "live" | "test";
  /** Whether requests are processed against live mode. */
  livemode: boolean;
}

/**
 * Report the active connection's live/test mode. The mode is fixed per
 * connection (derived from the API key prefix) and otherwise invisible to an
 * LLM, so this gives the model a way to confirm it before sending. Mirrors the
 * app-hosted `senderkit_context` tool.
 */
export const contextCommand = defineCommand<typeof schema.shape, SenderKitContext>({
  path: ["context"],
  mcpName: "senderkit_context",
  summary:
    "Report the active SenderKit connection mode. Call this before sending if you need to confirm whether messages are really delivered (live) or only recorded (test).",
  schema,
  run: (_input, { client }) =>
    Promise.resolve({ mode: client.mode, livemode: client.mode === "live" }),
  format: (res) => keyValues({ mode: res.mode, livemode: res.livemode }),
});
