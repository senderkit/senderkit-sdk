import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildMcpServer } from "../src/mcp/server";
import { buildClient, MissingApiKeyError } from "../src/core/context";
import { registry } from "../src/core/registry";

let originalHome: string | undefined;
let originalKey: string | undefined;

beforeEach(() => {
  originalHome = process.env["HOME"];
  originalKey = process.env["SENDERKIT_API_KEY"];
  // Isolate from any real config file.
  process.env["HOME"] = mkdtempSync(join(tmpdir(), "sk-mcp-"));
  delete process.env["SENDERKIT_API_KEY"];
});

afterEach(() => {
  process.env["HOME"] = originalHome;
  if (originalKey === undefined) delete process.env["SENDERKIT_API_KEY"];
  else process.env["SENDERKIT_API_KEY"] = originalKey;
});

describe("buildMcpServer", () => {
  it("fails fast when no key resolves (stdio entry path)", () => {
    expect(() => buildClient()).toThrow(MissingApiKeyError);
  });

  it("builds a server from an injected client", () => {
    const client = buildClient({ apiKey: "sk_test_abc" });
    expect(buildMcpServer(client)).toBeInstanceOf(McpServer);
  });
});

describe("registry", () => {
  it("exposes uniquely-named senderkit_ tools", () => {
    const names = registry.map((c) => c.mcpName);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.startsWith("senderkit_"))).toBe(true);
    expect(names).toContain("senderkit_send");
    expect(names).toContain("senderkit_templates_list");
  });
});
