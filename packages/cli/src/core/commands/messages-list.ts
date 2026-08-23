import type { ListMessagesResponse } from "@senderkit/sdk";
import { messagesListInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { table } from "../../cli/format";
import pc from "picocolors";

const schema = z.object(messagesListInput);

export const messagesListCommand = defineCommand<
  typeof schema.shape,
  ListMessagesResponse
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_messages_list),
  path: ["messages", "list"],
  schema,
  run: (input, { client }) =>
    client.messages.list({
      limit: input.limit,
      cursor: input.cursor,
      status: input.status,
      channel: input.channel,
      template: input.template,
      metadata: input.metadata,
      search: input.search,
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
