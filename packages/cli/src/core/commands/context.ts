import { contextInput } from "@senderkit/sdk/mcp-schemas";
import { MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
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
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_context, {
    // CLI help reads terser than the LLM-facing manifest description
    // (allowlisted in the manifest-parity test).
    summary:
      "Report the active SenderKit connection mode. Call this before sending if you need to confirm whether messages are really delivered (live) or only recorded (test).",
  }),
  path: ["context"],
  schema,
  run: (_input, { client }) =>
    Promise.resolve({ mode: client.mode, livemode: client.mode === "live" }),
  format: (res) => keyValues({ mode: res.mode, livemode: res.livemode }),
});
