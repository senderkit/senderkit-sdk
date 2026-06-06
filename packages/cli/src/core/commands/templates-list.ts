import type { Template } from "@senderkit/sdk";
import { templatesListInput } from "@senderkit/sdk/mcp-schemas";
import { MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { table } from "../../cli/format";

const schema = z.object(templatesListInput);

export const templatesListCommand = defineCommand<typeof schema.shape, Template[]>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_templates_list),
  path: ["templates", "list"],
  schema,
  run: (_input, { client }) => client.templates.list(),
  format: (templates) => {
    if (templates.length === 0) return "No templates found.";
    return table(
      ["SLUG", "CHANNEL", "STATUS", "UPDATED"],
      templates.map((t) => [
        t.slug,
        t.channel ?? "—",
        t.status ?? "—",
        t.updatedAt ? String(t.updatedAt) : "—",
      ]),
    );
  },
});
