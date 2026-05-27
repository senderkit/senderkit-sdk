import type { ListMessagesResponse } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command.js";
import { table } from "../../cli/format.js";
import { channelEnum } from "../schema.js";
import pc from "picocolors";

const schema = z.object({
  limit: z.coerce.number().int().positive().describe("Max messages to return.").optional(),
  cursor: z.string().describe("Pagination cursor.").optional(),
  status: z.string().describe("Filter by status (e.g. delivered).").optional(),
  channel: channelEnum.describe("Filter by channel.").optional(),
  template: z.string().describe("Filter by template slug.").optional(),
});

export const messagesListCommand = defineCommand<
  typeof schema.shape,
  ListMessagesResponse
>({
  path: ["messages", "list"],
  mcpName: "senderkit_messages_list",
  summary: "List messages, optionally filtered.",
  schema,
  run: (input, { client }) =>
    client.messages.list({
      limit: input.limit,
      cursor: input.cursor,
      status: input.status,
      channel: input.channel,
      template: input.template,
    }),
  format: (res) => {
    if (res.data.length === 0) return "No messages found.";
    const rows = table(
      ["ID", "STATUS", "CHANNEL", "TEMPLATE", "TO", "CREATED"],
      res.data.map((m) => [
        m.id,
        m.status,
        m.channel,
        m.template,
        m.to,
        m.createdAt,
      ]),
    );
    return res.nextCursor
      ? `${rows}\n${pc.dim(`next cursor: ${res.nextCursor}`)}`
      : rows;
  },
});
