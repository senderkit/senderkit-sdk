import type { SendResponse } from "@senderkit/sdk";
import { sendInput, MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(sendInput);

export const sendCommand = defineCommand<typeof schema.shape, SendResponse>({
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_send),
  path: ["send"],
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
      from: input.from,
      fromName: input.fromName,
    }),
  format: (res) =>
    `${success(`Queued message ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
      mode: res.livemode ? "live" : "test",
    })}`,
});
