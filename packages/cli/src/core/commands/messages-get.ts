import type { Message } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object({
  id: z.string().describe("Message ID (e.g. msg_…)."),
});

export const messagesGetCommand = defineCommand<typeof schema.shape, Message>({
  path: ["messages", "get"],
  mcpName: "senderkit_messages_get",
  summary: "Fetch a single message by ID.",
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
