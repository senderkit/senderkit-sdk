import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { SenderKit } from "@senderkit/sdk";
import {
  SEND_TOOL_LIVE_MODE_NOTE,
  MCP_TOOLS_BY_NAME,
  type McpToolName,
} from "@senderkit/sdk/mcp";
import { z } from "zod";
import { registry } from "../core/registry";
import { buildClient } from "../core/context";
import { describeError } from "../cli/errors";
import { VERSION } from "../version";

const SEND_TOOLS = new Set(["senderkit_send", "senderkit_send_raw"]);

/**
 * The read tools whose SDK-client result is a bare array. The client unwraps the
 * v1 `{ data: [...] }` envelope for ergonomics, but the shared manifest's
 * outputSchema — the same wire contract the app-hosted server serves — nests the
 * array under a named key. Re-wrap those results under that key before
 * validating so the CLI-bundled server emits the identical `structuredContent`
 * shape as the hosted server (`senderkit_messages_list` already returns the
 * `{ data, nextCursor }` object, so it is not listed here).
 */
const ARRAY_RESULT_KEY: Partial<Record<string, "data" | "domains">> = {
  senderkit_templates_list: "data",
  senderkit_inbound_addresses_list: "data",
  senderkit_inbound_messages_list: "data",
  senderkit_inbound_domains_list: "domains",
};

/**
 * Stamp the connection `mode` onto send-tool results (alongside the existing
 * `livemode`) so the model gets a post-send confirmation of whether the message
 * was really delivered (live) or only recorded (test). Mirrors the app-hosted
 * server. Non-send results pass through untouched.
 */
export function withResultMode(
  mcpName: string,
  output: unknown,
  mode: "live" | "test",
): unknown {
  if (!SEND_TOOLS.has(mcpName) || output === null || typeof output !== "object") {
    return output;
  }
  return { ...(output as Record<string, unknown>), mode };
}

/**
 * Shape a tool's result into the `structuredContent` the MCP spec (2025-06-18)
 * requires whenever a tool declares an `outputSchema`. The result is re-wrapped
 * if the SDK client unwrapped its list envelope (see {@link ARRAY_RESULT_KEY}),
 * then parsed through the shared manifest's `outputSchema` — the single source
 * of truth for the hosted server's wire contract. Parsing drops the internal
 * identifiers the SDK client carries but the schema deliberately omits (message
 * row `id`, `workspaceId`, `providerConnectionId`), so no internal id leaks and
 * the CLI-bundled server matches the hosted server field-for-field. The same
 * object is serialized into the text `content`, so the two channels can never
 * disagree, and the MCP SDK validates it against the advertised schema on every
 * call.
 */
export function toStructuredContent(
  mcpName: string,
  payload: unknown,
): Record<string, unknown> {
  const spec = MCP_TOOLS_BY_NAME[mcpName as McpToolName];
  const key = ARRAY_RESULT_KEY[mcpName];
  const shaped = key && Array.isArray(payload) ? { [key]: payload } : payload;
  return z.object(spec.outputSchema).parse(shaped) as Record<string, unknown>;
}

/**
 * Build the MCP server, registering one tool per registry command. The client
 * is injected so callers control auth — env/config for stdio, or a per-request
 * key from the Authorization header for the HTTP transport.
 */
export function buildMcpServer(client: SenderKit): McpServer {
  const server = new McpServer(
    { name: "senderkit", version: VERSION },
    { capabilities: { tools: {} } },
  );

  for (const command of registry) {
    const spec = MCP_TOOLS_BY_NAME[command.mcpName as McpToolName];
    const description = SEND_TOOLS.has(command.mcpName)
      ? command.summary + SEND_TOOL_LIVE_MODE_NOTE
      : command.summary;

    server.registerTool(
      command.mcpName,
      {
        title: command.title,
        description,
        annotations: command.annotations,
        inputSchema: command.schema.shape as z.ZodRawShape,
        outputSchema: spec.outputSchema,
      },
      async (args: Record<string, unknown>) => {
        try {
          const output = await command.run(args, { client });
          const payload = withResultMode(command.mcpName, output, client.mode);
          const structuredContent = toStructuredContent(command.mcpName, payload);
          return {
            content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
            structuredContent,
          };
        } catch (err) {
          return {
            isError: true,
            content: [{ type: "text", text: describeError(err) }],
          };
        }
      },
    );
  }

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = buildMcpServer(buildClient()); // fails fast if no key resolves
  await server.connect(new StdioServerTransport());
}
