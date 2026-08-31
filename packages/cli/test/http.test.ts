import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { handleHttpRequest } from "../src/mcp/http";

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as AddressInfo).port));
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

let mockApi: Server;
let mcpHost: Server;
let mcpPort: number;
let originalBaseUrl: string | undefined;

beforeEach(async () => {
  // Mock SenderKit API: returns templates when an sk_ key is present.
  mockApi = createServer((req, res) => {
    const auth = req.headers["authorization"] ?? "";
    res.setHeader("content-type", "application/json");
    if (!auth.includes("sk_")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "bad key" }));
      return;
    }
    // A conformant v1 templates list response, plus extra fields the lean
    // outputSchema omits (proving the server strips them from structuredContent).
    res.end(
      JSON.stringify({
        data: [
          {
            slug: "welcome",
            channel: "email",
            description: null,
            status: "active",
            updatedAt: "2026-01-01T00:00:00.000Z",
            currentVersionId: "ver_internal",
          },
        ],
      }),
    );
  });
  const apiPort = await listen(mockApi);
  originalBaseUrl = process.env["SENDERKIT_BASE_URL"];
  process.env["SENDERKIT_BASE_URL"] = `http://localhost:${apiPort}`;

  mcpHost = createServer((req, res) => void handleHttpRequest(req, res, "/mcp"));
  mcpPort = await listen(mcpHost);
});

afterEach(async () => {
  if (originalBaseUrl === undefined) delete process.env["SENDERKIT_BASE_URL"];
  else process.env["SENDERKIT_BASE_URL"] = originalBaseUrl;
  await close(mcpHost);
  await close(mockApi);
});

function clientTransport(headers?: Record<string, string>) {
  return new StreamableHTTPClientTransport(new URL(`http://localhost:${mcpPort}/mcp`), {
    requestInit: headers ? { headers } : undefined,
  });
}

describe("MCP HTTP server", () => {
  it("lists tools and runs one with a bearer key", async () => {
    const client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport({ Authorization: "Bearer sk_test_abc" }));

    const tools = await client.listTools();
    const listTool = tools.tools.find((t) => t.name === "senderkit_templates_list");
    expect(listTool).toBeDefined();
    // Every tool advertises an outputSchema so models understand its results.
    expect(listTool!.outputSchema).toMatchObject({ type: "object" });

    const res = await client.callTool({ name: "senderkit_templates_list", arguments: {} });
    expect((res.content as { text: string }[])[0]!.text).toContain("welcome");
    // The MCP SDK validated structuredContent against the advertised schema; the
    // bare-array client result is re-wrapped under `data` and internal-only
    // fields (currentVersionId) are dropped.
    const structured = res.structuredContent as { data: Record<string, unknown>[] };
    expect(structured.data).toEqual([
      {
        slug: "welcome",
        channel: "email",
        description: null,
        status: "active",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    await client.close();
  });

  it("rejects requests without an Authorization header", async () => {
    const client = new Client({ name: "test", version: "0.0.0" });
    await expect(client.connect(clientTransport())).rejects.toThrow();
  });
});
