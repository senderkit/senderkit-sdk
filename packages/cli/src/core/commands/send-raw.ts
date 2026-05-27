import type { SendRawRequest, SendResponse } from "@senderkit/sdk";
import { z } from "zod";
import { defineCommand } from "../command";
import { success, keyValues } from "../../cli/format";
import { channelEnum, jsonRecord, metadataRecord } from "../schema";

const schema = z.object({
  channel: channelEnum.describe("Channel: email, sms, or push."),
  to: z.string().describe("Recipient address."),
  // email
  subject: z.string().describe("Email subject (email).").optional(),
  preheader: z.string().describe("Email preheader (email).").optional(),
  html: z.string().describe("Email HTML body (email).").optional(),
  text: z.string().describe("Email plain-text body (email).").optional(),
  from: z.string().describe("From override (email).").optional(),
  // sms + push
  body: z.string().describe("Message body (sms, push).").optional(),
  // push
  title: z.string().describe("Notification title (push).").optional(),
  badge: z.coerce.number().int().describe("Badge count (push).").optional(),
  sound: z.string().describe("Notification sound (push).").optional(),
  pushData: jsonRecord("Push data payload as a JSON object of strings (push).").optional(),
  // shared
  data: jsonRecord("Variables for interpolation as a JSON object.").optional(),
  metadata: metadataRecord("Free-form metadata as a JSON object.").optional(),
  interpolate: z.coerce
    .boolean()
    .describe("Run server-side variable substitution over content.")
    .optional(),
  idempotencyKey: z.string().describe("Idempotency key.").optional(),
});

function buildRequest(input: z.infer<typeof schema>): SendRawRequest {
  const base = {
    to: input.to,
    data: input.data,
    metadata: input.metadata,
    interpolate: input.interpolate,
    idempotencyKey: input.idempotencyKey,
  };

  if (input.channel === "email") {
    if (!input.subject || !input.html) {
      throw new Error("send-raw email requires --subject and --html.");
    }
    return {
      ...base,
      channel: "email",
      from: input.from,
      content: {
        subject: input.subject,
        html: input.html,
        text: input.text,
        preheader: input.preheader,
      },
    };
  }

  if (input.channel === "sms") {
    if (!input.body) throw new Error("send-raw sms requires --body.");
    return { ...base, channel: "sms", content: { body: input.body } };
  }

  // push
  if (!input.title || !input.body) {
    throw new Error("send-raw push requires --title and --body.");
  }
  return {
    ...base,
    channel: "push",
    content: {
      title: input.title,
      body: input.body,
      data: input.pushData as Record<string, string> | undefined,
      badge: input.badge,
      sound: input.sound,
    },
  };
}

export const sendRawCommand = defineCommand<typeof schema.shape, SendResponse>({
  path: ["send-raw"],
  mcpName: "senderkit_send_raw",
  summary: "Send inline content without a registered template.",
  schema,
  positional: ["to"],
  run: async (input, { client }) => client.sendRaw(buildRequest(input)),
  format: (res) =>
    `${success(`Queued message ${res.id}`)}\n${keyValues({
      id: res.id,
      status: res.status,
      mode: res.livemode ? "live" : "test",
    })}`,
});
