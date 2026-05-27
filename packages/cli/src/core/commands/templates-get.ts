import type { Template } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command.js";
import { keyValues } from "../../cli/format.js";

const schema = z.object({
  slug: z.string().describe("Template slug."),
});

export const templatesGetCommand = defineCommand<typeof schema.shape, Template>({
  path: ["templates", "get"],
  mcpName: "senderkit_templates_get",
  summary: "Fetch a single template by slug.",
  schema,
  positional: ["slug"],
  run: (input, { client }) => client.templates.get(input.slug),
  format: (t) =>
    keyValues({
      slug: t.slug,
      name: t.name,
      channels: t.channels.join(", "),
      latestVersion: t.latestVersion,
    }),
});
