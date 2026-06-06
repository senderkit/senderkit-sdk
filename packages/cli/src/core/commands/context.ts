import type { SenderKitContext } from "@senderkit/sdk";
import { contextInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(contextInput);

/**
 * Report the connected workspace (name, slug) and the live/test send mode.
 * Fetches `/v1/context` so the value is authoritative and workspace-aware,
 * mirroring the app-hosted `senderkit_context` tool.
 */
export const contextCommand = defineCommand<typeof schema.shape, SenderKitContext>(
  {
    ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_context, {
      // CLI help reads terser than the LLM-facing manifest description
      // (allowlisted in the manifest-parity test).
      summary: "Report the connected workspace and send mode (live or test).",
    }),
    path: ["context"],
    schema,
    run: (_input, { client }) => client.context(),
    format: (res) =>
      keyValues({
        workspace: res.workspace.name,
        slug: res.workspace.slug,
        mode: res.mode,
      }),
  },
);
