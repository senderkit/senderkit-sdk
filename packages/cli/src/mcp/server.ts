import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { SenderKit } from "@senderkit/sdk";
import { SEND_TOOL_LIVE_MODE_NOTE } from "@senderkit/sdk/mcp";
import type { z } from "zod";
import { registry } from "../core/registry";
import { buildClient } from "../core/context";
import { describeError } from "../cli/errors";
import { VERSION } from "../version";

const SEND_TOOLS = new Set(["senderkit_send", "senderkit_send_raw"]);

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
      },
      async (args: Record<string, unknown>) => {
        try {
          const output = await command.run(args, { client });
          const payload = withResultMode(command.mcpName, output, client.mode);
          return {
            content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
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
