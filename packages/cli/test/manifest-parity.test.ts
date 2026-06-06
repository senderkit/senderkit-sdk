import { describe, expect, it } from "vitest";
import { registry } from "../src/core/registry";
import { MCP_TOOLS_BY_NAME, type McpToolName } from "@senderkit/sdk/mcp";

// Commands whose CLI help intentionally differs from the manifest description.
// Adding a command here is a conscious decision; anything not listed must match.
const SUMMARY_OVERRIDES = new Set<McpToolName>(["senderkit_context"]);

describe("CLI ↔ manifest parity", () => {
  it("every command derives title/annotations/schema from the manifest", () => {
    for (const c of registry) {
      const spec = MCP_TOOLS_BY_NAME[c.mcpName as McpToolName];
      expect(spec, `no manifest entry for ${c.mcpName}`).toBeDefined();
      expect(c.title).toBe(spec.title);
      expect(c.annotations).toEqual(spec.annotations);
      // The command's schema is built from the same mcp-schemas shape the
      // manifest references, so their fields must match (z.object does not
      // preserve the input object's identity, so compare keys).
      expect(Object.keys(c.schema.shape).sort()).toEqual(
        Object.keys(spec.inputSchema).sort(),
      );
    }
  });

  it("only allowlisted commands override the description", () => {
    const diverged = registry
      .filter(
        (c) =>
          c.summary !== MCP_TOOLS_BY_NAME[c.mcpName as McpToolName].description,
      )
      .map((c) => c.mcpName);
    expect(new Set(diverged)).toEqual(SUMMARY_OVERRIDES);
  });
});
