import type { SendRawRequest, SendResponse } from "@senderkit/sdk";
import { sendRawInput } from "@senderkit/sdk/mcp-schemas";
import { MCP_TOOLS_BY_NAME } from "@senderkit/sdk/mcp";
import { z } from "zod";
import { defineCommand, fromSpec } from "../command";
import { success, keyValues } from "../../cli/format";

const schema = z.object(sendRawInput);

function buildRequest(input: z.infer<typeof schema>): SendRawRequest {
  const base = {
    to: input.to,
    vars: input.vars,
    metadata: input.metadata,
    interpolate: input.interpolate,
    scheduledAt: input.scheduledAt,
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
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo,
        attachments: input.attachments,
      },
    };
  }

  if (input.channel === "sms") {
    if (!input.body) throw new Error("send-raw sms requires --body.");
    return { ...base, channel: "sms", content: { body: input.body } };
  }

  if (input.channel === "web-push") {
    if (!input.title || !input.body) {
      throw new Error("send-raw web-push requires --title and --body.");
    }
    return {
      ...base,
      channel: "web-push",
      content: {
        title: input.title,
        body: input.body,
        icon: input.icon,
        clickUrl: input.clickUrl,
        data: input.pushData as Record<string, string> | undefined,
        badge: input.badge,
      },
    };
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
  ...fromSpec(MCP_TOOLS_BY_NAME.senderkit_send_raw),
  path: ["send-raw"],
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
