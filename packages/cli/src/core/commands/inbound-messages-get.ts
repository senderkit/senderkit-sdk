import type { InboundMessage } from "@senderkit/sdk";
import { inboundMessagesGetInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { keyValues } from "../../cli/format";

const schema = z.object(inboundMessagesGetInput);

export const inboundMessagesGetCommand = defineCommand<
  typeof schema.shape,
  InboundMessage
>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_inbound_messages_get),
  path: ["inbound", "messages", "get"],
  schema,
  positional: ["id"],
  run: (input, { client }) => client.inbound.messages.get(input.id),
  format: (m) =>
    keyValues({
      id: m.id,
      status: m.status,
      address: m.address,
      from: m.from?.email,
      subject: m.subject,
      attachments: m.attachments?.length ?? 0,
      sizeBytes: m.sizeBytes,
      receivedAt: m.receivedAt,
    }),
});
