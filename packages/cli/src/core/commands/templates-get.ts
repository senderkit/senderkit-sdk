import type { Template } from "@senderkit/sdk";
import { templatesGetInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(templatesGetInput);

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
      channel: t.channel,
      status: t.status,
      description: t.description,
      version: t.currentVersion?.versionNumber,
      updatedAt: t.updatedAt,
    }),
});
