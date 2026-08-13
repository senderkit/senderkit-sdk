import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildMcpServer, withResultMode } from "../src/mcp/server";
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
  it("exposes uniquely-named senderkit_ tools matching the app-hosted server", () => {
    const names = registry.map((c) => c.mcpName);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.startsWith("senderkit_"))).toBe(true);
    // The tools that both the CLI-bundled stdio server and the app-hosted
    // HTTP server are required to expose.
    expect(new Set(names)).toEqual(
      new Set([
        "senderkit_send",
        "senderkit_send_raw",
        "senderkit_templates_list",
        "senderkit_templates_get",
        "senderkit_messages_list",
        "senderkit_messages_get",
        "senderkit_cancel_message",
        "senderkit_context",
        "senderkit_inbound_addresses_list",
        "senderkit_inbound_addresses_create",
        "senderkit_inbound_addresses_delete",
        "senderkit_inbound_messages_list",
        "senderkit_inbound_messages_get",
        "senderkit_inbound_domains_list",
        "senderkit_inbound_domains_create",
        "senderkit_inbound_domains_delete",
      ]),
    );
  });
});

describe("tool annotations", () => {
  // The Anthropic Claude Connectors Directory review requires a human-readable
  // title; OpenAI's ChatGPT/Codex plugin review additionally requires explicit
  // readOnlyHint, openWorldHint, and destructiveHint values on every tool.
  const READ_ONLY = {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  } as const;
  const DESTRUCTIVE_WRITE = {
    readOnlyHint: false,
    openWorldHint: false,
    destructiveHint: true,
  } as const;
  // The send tools are the only open-world ones: they deliver messages to
  // recipients outside SenderKit.
  const OPEN_WORLD_SEND = {
    readOnlyHint: false,
    openWorldHint: true,
    destructiveHint: true,
  } as const;

  const EXPECTED = {
    senderkit_context: {
      title: "Get Workspace Context",
      annotations: READ_ONLY,
    },
    senderkit_send: {
      title: "Send Templated Message",
      annotations: OPEN_WORLD_SEND,
    },
    senderkit_send_raw: {
      title: "Send Raw Message",
      annotations: OPEN_WORLD_SEND,
    },
    senderkit_cancel_message: {
      title: "Cancel Scheduled Message",
      annotations: DESTRUCTIVE_WRITE,
    },
    senderkit_messages_list: { title: "List Messages", annotations: READ_ONLY },
    senderkit_messages_get: { title: "Get Message", annotations: READ_ONLY },
    senderkit_templates_list: {
      title: "List Templates",
      annotations: READ_ONLY,
    },
    senderkit_templates_get: { title: "Get Template", annotations: READ_ONLY },
    senderkit_inbound_addresses_list: {
      title: "List Inbound Addresses",
      annotations: READ_ONLY,
    },
    senderkit_inbound_addresses_create: {
      title: "Create Inbound Address",
      // Additive write: creating an address is fully reversed by deleting it,
      // so the manifest advertises an explicit non-destructive write.
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    senderkit_inbound_addresses_delete: {
      title: "Delete Inbound Address",
      annotations: DESTRUCTIVE_WRITE,
    },
    senderkit_inbound_messages_list: {
      title: "List Inbound Messages",
      annotations: READ_ONLY,
    },
    senderkit_inbound_messages_get: {
      title: "Get Inbound Message",
      annotations: READ_ONLY,
    },
    senderkit_inbound_domains_list: {
      title: "List Inbound Domains",
      annotations: READ_ONLY,
    },
    senderkit_inbound_domains_create: {
      title: "Claim Inbound Domain",
      annotations: DESTRUCTIVE_WRITE,
    },
    senderkit_inbound_domains_delete: {
      title: "Delete Inbound Domain",
      annotations: DESTRUCTIVE_WRITE,
    },
  } as const;

  it("assigns the directory-required title and the full hint trio to every tool", () => {
    for (const command of registry) {
      const expected = EXPECTED[command.mcpName as keyof typeof EXPECTED];
      expect(expected, `no expectation for ${command.mcpName}`).toBeDefined();
      expect(command.title).toBe(expected.title);
      expect(command.annotations, command.mcpName).toEqual(expected.annotations);
    }
  });

  it("covers all registered tools", () => {
    expect(registry.map((c) => c.mcpName).sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
  });

  it("surfaces title + annotations over the wire via tools/list", async () => {
    const server = buildMcpServer(buildClient({ apiKey: "sk_test_introspect" }));
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "introspect", version: "0" });
    await Promise.all([server.connect(serverT), client.connect(clientT)]);

    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(EXPECTED).sort());

      for (const tool of tools) {
        const expected = EXPECTED[tool.name as keyof typeof EXPECTED];
        expect(tool.title).toBe(expected.title);
        expect(tool.annotations, tool.name).toMatchObject(expected.annotations);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("withResultMode", () => {
  it("stamps mode onto send-tool results", () => {
    const out = { id: "msg_x", status: "queued", livemode: false };
    expect(withResultMode("senderkit_send", out, "test")).toEqual({
      ...out,
      mode: "test",
    });
    expect(withResultMode("senderkit_send_raw", out, "live")).toEqual({
      ...out,
      mode: "live",
    });
  });

  it("leaves non-send results untouched", () => {
    const list = [{ slug: "welcome" }];
    expect(withResultMode("senderkit_templates_list", list, "live")).toBe(list);
  });

  it("passes non-object outputs through", () => {
    expect(withResultMode("senderkit_send", null, "live")).toBeNull();
  });
});
