import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { handleHttpRequest } from "../src/mcp/http.js";

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
    res.end(JSON.stringify({ data: [{ slug: "welcome", name: "Welcome", channels: ["email"] }] }));
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
    expect(tools.tools.map((t) => t.name)).toContain("senderkit_templates_list");

    const res = await client.callTool({ name: "senderkit_templates_list", arguments: {} });
    expect((res.content as { text: string }[])[0]!.text).toContain("welcome");

    await client.close();
  });

  it("rejects requests without an Authorization header", async () => {
    const client = new Client({ name: "test", version: "0.0.0" });
    await expect(client.connect(clientTransport())).rejects.toThrow();
  });
});
