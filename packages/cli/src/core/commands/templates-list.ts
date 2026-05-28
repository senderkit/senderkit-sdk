import type { Template } from "@senderkit/sdk";
import { templatesListInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { table } from "../../cli/format";

const schema = z.object(templatesListInput);

export const templatesListCommand = defineCommand<typeof schema.shape, Template[]>({
  path: ["templates", "list"],
  mcpName: "senderkit_templates_list",
  summary: "List available templates.",
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
