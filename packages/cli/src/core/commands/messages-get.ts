import type { Message } from "@senderkit/sdk";
import { messagesGetInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(messagesGetInput);

export const messagesGetCommand = defineCommand<typeof schema.shape, Message>({
  path: ["messages", "get"],
  mcpName: "senderkit_messages_get",
  title: "Get Message",
  summary: "Fetch a single message by ID.",
  annotations: { readOnlyHint: true },
  schema,
  positional: ["id"],
  run: (input, { client }) => client.messages.get(input.id),
  format: (m) =>
    keyValues({
      id: m.publicId ?? m.id,
      status: m.status,
      channel: m.channel,
      template: m.templateSlug,
      recipient: m.recipient,
      createdAt: m.createdAt,
    }),
});
