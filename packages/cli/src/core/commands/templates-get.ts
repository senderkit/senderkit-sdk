import type { Template } from "@senderkit/sdk";
import { templatesGetInput } from "@senderkit/sdk/mcp-schemas";
import { MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(templatesGetInput);

export const templatesGetCommand = defineCommand<typeof schema.shape, Template>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_templates_get),
  path: ["templates", "get"],
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
