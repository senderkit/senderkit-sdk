import type { SendResponse } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command.js";
import { success, keyValues } from "../../cli/format.js";
import { channelEnum, jsonRecord, metadataRecord } from "../schema.js";

const schema = z.object({
  template: z.string().describe("Template slug (e.g. \"welcome\")."),
  to: z.string().describe("Recipient address."),
  data: jsonRecord("Template variables as a JSON object.").optional(),
  channel: channelEnum.describe("Force a channel (defaults to template's primary).").optional(),
  version: z.coerce.number().int().describe("Pin a specific template version.").optional(),
  metadata: metadataRecord("Free-form metadata as a JSON object.").optional(),
  idempotencyKey: z
    .string()
    .describe("Idempotency key. Auto-generated if omitted.")
    .optional(),
});

export const sendCommand = defineCommand<typeof schema.shape, SendResponse>({
  path: ["send"],
  mcpName: "senderkit_send",
  summary: "Send a templated message to a recipient.",
  schema,
  positional: ["template", "to"],
  run: (input, { client }) =>
    client.send({
      template: input.template,
      to: input.to,
      data: input.data,
      channel: input.channel,
      version: input.version,
      metadata: input.metadata,
      idempotencyKey: input.idempotencyKey,
    }),
  format: (res) =>
    `${success(`Queued message ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
      mode: res.livemode ? "live" : "test",
    })}`,
});
