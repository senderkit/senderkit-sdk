import type { ListMessagesResponse } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command";
import { table } from "../../cli/format";
import { channelEnum, metadataRecord } from "../schema";
import pc from "picocolors";

const schema = z.object({
  limit: z.coerce.number().int().positive().describe("Max messages to return.").optional(),
  cursor: z.string().describe("Pagination cursor.").optional(),
  status: z.string().describe("Filter by status (e.g. delivered).").optional(),
  channel: channelEnum.describe("Filter by channel.").optional(),
  template: z.string().describe("Filter by template slug.").optional(),
  metadata: metadataRecord(
    "Filter by metadata as a JSON object (each key/value must match).",
  ).optional(),
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
      metadata: input.metadata,
    }),
  format: (res) => {
    if (res.data.length === 0) return "No messages found.";
    const rows = table(
      ["ID", "STATUS", "CHANNEL", "TEMPLATE", "TO", "CREATED"],
      res.data.map((m) => [
        m.publicId ?? m.id,
        m.status,
        m.channel,
        m.templateSlug ?? "—",
        m.recipient,
        String(m.createdAt),
      ]),
    );
    return res.nextCursor
      ? `${rows}\n${pc.dim(`next cursor: ${res.nextCursor}`)}`
      : rows;
  },
});
