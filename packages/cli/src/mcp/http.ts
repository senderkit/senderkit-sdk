import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildClient } from "../core/context.js";
import { buildMcpServer } from "./server.js";

export interface HttpServerOptions {
  port: number;
  /** Path the MCP endpoint is served on. Defaults to "/mcp". */
  path?: string;
}

/** Extract a bearer token from the Authorization header, if present. */
export function bearerToken(req: IncomingMessage): string | undefined {
  const header = req.headers["authorization"];
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Serve the MCP server over Streamable HTTP. Stateless: each POST builds a fresh
 * server + transport authenticated by the request's `Authorization: Bearer`
 * token, so one process serves every caller/tenant.
 */
export async function startHttpServer(options: HttpServerOptions): Promise<void> {
  const path = options.path ?? "/mcp";

  const httpServer = createServer((req, res) => {
    void handleHttpRequest(req, res, path);
  });

  await new Promise<void>((resolve) => httpServer.listen(options.port, resolve));
  const addr = httpServer.address();
  const port = typeof addr === "object" && addr ? addr.port : options.port;
  process.stderr.write(`SenderKit MCP listening on http://localhost:${port}${path}\n`);
}

export async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== path) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  // Stateless mode supports request/response POST only.
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    sendJson(res, 401, {
      error: "unauthorized",
      message: "Missing 'Authorization: Bearer <SenderKit API key>' header.",
    });
    return;
  }

  const server = buildMcpServer(buildClient({ apiKey: token }));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch {
    if (!res.headersSent) sendJson(res, 500, { error: "internal_error" });
  }
}
