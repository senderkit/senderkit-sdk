import type { Template } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command.js";
import { table } from "../../cli/format.js";

const schema = z.object({});

export const templatesListCommand = defineCommand<typeof schema.shape, Template[]>({
  path: ["templates", "list"],
  mcpName: "senderkit_templates_list",
  summary: "List available templates.",
  schema,
  run: (_input, { client }) => client.templates.list(),
  format: (templates) => {
    if (templates.length === 0) return "No templates found.";
    return table(
      ["SLUG", "NAME", "CHANNELS", "VERSION"],
      templates.map((t) => [
        t.slug,
        t.name,
        t.channels.join(", "),
        t.latestVersion === undefined ? "—" : String(t.latestVersion),
      ]),
    );
  },
});
