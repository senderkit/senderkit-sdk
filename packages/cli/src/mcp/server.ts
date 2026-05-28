import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { SenderKit } from "@senderkit/sdk";
import type { z } from "zod";
import { registry } from "../core/registry";
import { buildClient } from "../core/context";
import { describeError } from "../cli/errors";
import { VERSION } from "../version";

const SEND_TOOLS = new Set(["senderkit_send", "senderkit_send_raw"]);

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
      ? `${command.summary} Dispatches a real message; live vs test mode is determined by the API key prefix (sk_live_ / sk_test_).`
      : command.summary;

    server.registerTool(
      command.mcpName,
      {
        description,
        inputSchema: command.schema.shape as z.ZodRawShape,
      },
      async (args: Record<string, unknown>) => {
        try {
          const output = await command.run(args, { client });
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
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
