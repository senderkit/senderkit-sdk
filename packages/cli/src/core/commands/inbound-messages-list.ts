import type { InboundMessageSummary } from "@senderkit/sdk";
import { inboundMessagesListInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { table } from "../../cli/format";

const schema = z.object(inboundMessagesListInput);

export const inboundMessagesListCommand = defineCommand<
  typeof schema.shape,
  InboundMessageSummary[]
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_messages_list),
  path: ["inbound", "messages", "list"],
  schema,
  run: (input, { client }) =>
    client.inbound.messages.list({
      limit: input.limit,
      before: input.before,
      address: input.address,
    }),
  format: (messages) => {
    if (messages.length === 0) return "No received messages found.";
    return table(
      ["ID", "STATUS", "FROM", "SUBJECT", "SIZE", "RECEIVED"],
      messages.map((m) => [
        m.id,
        m.status,
        m.from ?? "—",
        m.subject ?? "—",
        String(m.sizeBytes),
        String(m.receivedAt),
      ]),
    );
  },
});
