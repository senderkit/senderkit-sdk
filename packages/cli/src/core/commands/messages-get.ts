import type { Message } from "@senderkit/sdk";
import { messagesGetInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(messagesGetInput);

export const messagesGetCommand = defineCommand<typeof schema.shape, Message>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_messages_get),
  path: ["messages", "get"],
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
