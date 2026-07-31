import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as schemas from "../src/mcp-schemas";
import { MCP_TOOLS, MCP_TOOLS_BY_NAME, type ToolAnnotations } from "../src/mcp";

const EXPECTED: Record<string, keyof typeof schemas> = {
  senderkit_context: "contextInput",
  senderkit_send: "sendInput",
  senderkit_send_raw: "sendRawInput",
  senderkit_templates_list: "templatesListInput",
  senderkit_templates_get: "templatesGetInput",
  senderkit_messages_list: "messagesListInput",
  senderkit_messages_get: "messagesGetInput",
  senderkit_cancel_message: "cancelMessageInput",
  senderkit_inbound_addresses_list: "inboundAddressesListInput",
  senderkit_inbound_addresses_create: "inboundAddressesCreateInput",
  senderkit_inbound_addresses_delete: "inboundAddressesDeleteInput",
  senderkit_inbound_messages_list: "inboundMessagesListInput",
  senderkit_inbound_messages_get: "inboundMessagesGetInput",
  senderkit_inbound_domains_list: "inboundDomainsListInput",
  senderkit_inbound_domains_create: "inboundDomainsCreateInput",
  senderkit_inbound_domains_delete: "inboundDomainsDeleteInput",
};

describe("MCP_TOOLS", () => {
  it("covers exactly the expected tools, in order", () => {
    expect(MCP_TOOLS.map((t) => t.name)).toEqual(Object.keys(EXPECTED));
  });

  it("each spec reuses the shared mcp-schemas shape", () => {
    for (const t of MCP_TOOLS) {
      const key = EXPECTED[t.name];
      expect(key, `unexpected tool ${t.name}`).toBeDefined();
      expect(t.inputSchema).toBe(schemas[key!]);
    }
  });

  it("each tool sets exactly one behaviour hint, with a non-empty title + description", () => {
    for (const t of MCP_TOOLS) {
      const a = t.annotations as {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
      };
      expect("readOnlyHint" in a !== "destructiveHint" in a, t.name).toBe(true);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("admits a non-destructive write annotation (destructiveHint: false)", () => {
    // Type-level: app-only tools (e.g. templates_create) declare additive
    // writes; the shared union must not force true.
    const nonDestructiveWrite: ToolAnnotations = { destructiveHint: false };
    expect(nonDestructiveWrite.destructiveHint).toBe(false);
  });

  it("descriptions carry no transport-specific send-mode note", () => {
    for (const t of MCP_TOOLS) {
      expect(/API key prefix|TEST mode|LIVE mode/.test(t.description)).toBe(false);
    }
  });

  it("MCP_TOOLS_BY_NAME indexes every tool", () => {
    expect(Object.keys(MCP_TOOLS_BY_NAME).sort()).toEqual(
      MCP_TOOLS.map((t) => t.name).sort(),
    );
  });

  it("field descriptions carry no CLI input conventions", () => {
    // The manifest is the MCP wire contract; CLI flag phrasing lives in each
    // command's `flagHelp` (packages/cli), not here.
    for (const t of MCP_TOOLS) {
      for (const [name, field] of Object.entries(t.inputSchema)) {
        const description = (field as { description?: string }).description;
        if (description) {
          expect(description, `${t.name}.${name}`).not.toMatch(/\bCLI\b/);
        }
      }
    }
  });
});

describe("schema bounds", () => {
  it("messages_list limit enforces the service clamp (1-200), coercing CLI strings", () => {
    const schema = z.object(schemas.messagesListInput);
    expect(schema.parse({ limit: 200 }).limit).toBe(200);
    expect(schema.parse({ limit: "50" }).limit).toBe(50);
    expect(() => schema.parse({ limit: 0 })).toThrow();
    expect(() => schema.parse({ limit: 201 })).toThrow();
  });

  it("inbound_messages_list limit enforces the service clamp (1-100)", () => {
    const schema = z.object(schemas.inboundMessagesListInput);
    expect(schema.parse({ limit: 100 }).limit).toBe(100);
    expect(() => schema.parse({ limit: 101 })).toThrow();
  });

  it("cc/bcc cap at 50 recipients, matching the API validator", () => {
    const schema = z.object(schemas.sendInput);
    const fifty = Array.from({ length: 50 }, (_, i) => `u${i}@x.com`);
    const base = { template: "welcome", to: "u@x.com" };
    expect(schema.parse({ ...base, cc: fifty }).cc).toHaveLength(50);
    expect(() => schema.parse({ ...base, cc: [...fifty, "z@x.com"] })).toThrow();
    expect(() => schema.parse({ ...base, bcc: [...fifty, "z@x.com"] })).toThrow();
  });
});

describe("inbound manifest parity with the hosted app's definitions", () => {
  it("inbound_addresses_create is an additive, non-destructive write", () => {
    // Creating an address is fully reversed by deleting it again; flagging it
    // destructive makes well-behaved clients demand confirmation for a
    // reversible operation.
    expect(
      MCP_TOOLS_BY_NAME.senderkit_inbound_addresses_create.annotations,
    ).toEqual({ destructiveHint: false });
  });

  it("livemode description does not promise a quota exemption", () => {
    // Every address, test or live, counts toward the plan's inbound-address
    // limit — the manifest must not claim otherwise.
    const shape = schemas.inboundAddressesCreateInput;
    const desc = (shape.livemode as z.ZodType).description ?? "";
    expect(desc).not.toMatch(/count against quota/i);
    expect(desc, "should say the plan limit applies to every address").toMatch(/plan/i);
  });

  it("inbound message tool titles match the app's served titles", () => {
    expect(MCP_TOOLS_BY_NAME.senderkit_inbound_messages_list.title).toBe(
      "List Inbound Messages",
    );
    expect(MCP_TOOLS_BY_NAME.senderkit_inbound_messages_get.title).toBe(
      "Get Inbound Message",
    );
  });

  it("inbound_messages_list.before rejects non-ISO input with a helpful message", () => {
    const schema = z.object(schemas.inboundMessagesListInput);
    const res = schema.safeParse({ before: "yesterday" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/ISO 8601/);
    }
  });
});
