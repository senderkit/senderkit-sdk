import type { CancelMessageResponse } from "@senderkit/sdk";
import { cancelMessageInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(cancelMessageInput);

export const messagesCancelCommand = defineCommand<
  typeof schema.shape,
  CancelMessageResponse
>({
  path: ["messages", "cancel"],
  mcpName: "senderkit_cancel_message",
  title: "Cancel Scheduled Message",
  summary: "Cancel a still-pending (scheduled or queued) message by ID.",
  annotations: { destructiveHint: true },
  schema,
  positional: ["id"],
  run: (input, { client }) => client.messages.cancel(input.id),
  format: (res) =>
    `${success(`Canceled ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
    })}`,
});
