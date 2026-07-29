import { describe, expect, it } from "vitest";
import * as schemas from "../src/mcp-schemas";
import { MCP_TOOLS, MCP_TOOLS_BY_NAME } from "../src/mcp";

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

  it("each tool is read-only XOR destructive, with a non-empty title + description", () => {
    for (const t of MCP_TOOLS) {
      const a = t.annotations as {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
      };
      expect(Boolean(a.readOnlyHint) !== Boolean(a.destructiveHint)).toBe(true);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
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
});
