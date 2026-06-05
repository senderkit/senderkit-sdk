import type { SendResponse } from "@senderkit/sdk";
import { sendInput } from "@senderkit/sdk/mcp-schemas";
import { z } from "zod";
import { defineCommand } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(sendInput);

export const sendCommand = defineCommand<typeof schema.shape, SendResponse>({
  path: ["send"],
  mcpName: "senderkit_send",
  title: "Send Templated Message",
  summary: "Send a templated message to a recipient.",
  annotations: { destructiveHint: true },
  schema,
  positional: ["template", "to"],
  run: (input, { client }) =>
    client.send({
      template: input.template,
      to: input.to,
      vars: input.vars,
      channel: input.channel,
      version: input.version,
      metadata: input.metadata,
      scheduledAt: input.scheduledAt,
      idempotencyKey: input.idempotencyKey,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      attachments: input.attachments,
    }),
  format: (res) =>
    `${success(`Queued message ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
      mode: res.livemode ? "live" : "test",
    })}`,
});
