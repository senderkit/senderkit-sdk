import { describe, expect, it } from "vitest";
import { sendCommand } from "../src/core/commands/send";
import { sendRawCommand } from "../src/core/commands/send-raw";
import { templatesListCommand } from "../src/core/commands/templates-list";
import { templatesGetCommand } from "../src/core/commands/templates-get";
import { messagesListCommand } from "../src/core/commands/messages-list";
import { messagesGetCommand } from "../src/core/commands/messages-get";
import { messagesCancelCommand } from "../src/core/commands/messages-cancel";
import { contextCommand } from "../src/core/commands/context";
import { inboundAddressesListCommand } from "../src/core/commands/inbound-addresses-list";
import { inboundAddressesCreateCommand } from "../src/core/commands/inbound-addresses-create";
import { inboundAddressesDeleteCommand } from "../src/core/commands/inbound-addresses-delete";
import { inboundMessagesListCommand } from "../src/core/commands/inbound-messages-list";
import { inboundMessagesGetCommand } from "../src/core/commands/inbound-messages-get";
import { stubClient } from "./helpers";

describe("send command", () => {
  it("maps input to client.send and formats output", async () => {
    const { client, calls } = stubClient();
    const out = await sendCommand.run(
      { template: "welcome", to: "u@x.com", vars: { name: "Jo" } },
      { client },
    );
    expect(calls.send).toMatchObject({ template: "welcome", to: "u@x.com", vars: { name: "Jo" } });
    expect(out.id).toBe("msg_x");
    expect(sendCommand.format(out)).toContain("msg_x");
    expect(sendCommand.format(out)).toContain("test");
  });
});

describe("send command — envelope forwarding", () => {
  it("threads cc/bcc/replyTo/attachments through to client.send", async () => {
    const { client, calls } = stubClient();
    await sendCommand.run(
      {
        template: "welcome",
        to: "u@x.com",
        cc: ["c@x.com"],
        bcc: ["b@x.com"],
        replyTo: "r@x.com",
        attachments: [{ filename: "n.txt", contentType: "text/plain", content: "aGk=" }],
      },
      { client },
    );
    expect(calls.send).toMatchObject({
      cc: ["c@x.com"],
      bcc: ["b@x.com"],
      replyTo: "r@x.com",
      attachments: [{ filename: "n.txt", contentType: "text/plain", content: "aGk=" }],
    });
  });
});

describe("send-raw command", () => {
  it("builds an email request", async () => {
    const { client, calls } = stubClient();
    await sendRawCommand.run(
      { channel: "email", to: "u@x.com", subject: "Hi", html: "<p>x</p>" },
      { client },
    );
    expect(calls.sendRaw).toMatchObject({
      channel: "email",
      to: "u@x.com",
      content: { subject: "Hi", html: "<p>x</p>" },
    });
  });

  it("threads cc/bcc/replyTo/attachments onto raw email content", async () => {
    const { client, calls } = stubClient();
    await sendRawCommand.run(
      {
        channel: "email",
        to: "u@x.com",
        subject: "Hi",
        html: "<p>x</p>",
        cc: ["c@x.com"],
        bcc: ["b@x.com"],
        replyTo: "r@x.com",
        attachments: [{ filename: "n.txt", contentType: "text/plain", content: "aGk=" }],
      },
      { client },
    );
    expect(calls.sendRaw).toMatchObject({
      channel: "email",
      content: {
        cc: ["c@x.com"],
        bcc: ["b@x.com"],
        replyTo: "r@x.com",
        attachments: [{ filename: "n.txt", contentType: "text/plain", content: "aGk=" }],
      },
    });
  });

  it("rejects an email without subject/html", async () => {
    const { client } = stubClient();
    await expect(
      sendRawCommand.run({ channel: "email", to: "u@x.com" }, { client }),
    ).rejects.toThrow(/subject and --html/);
  });

  it("maps pushData onto content.data for push", async () => {
    const { client, calls } = stubClient();
    await sendRawCommand.run(
      { channel: "push", to: "tok", title: "Hi", body: "yo", pushData: { k: "v" } },
      { client },
    );
    expect(calls.sendRaw).toMatchObject({
      channel: "push",
      content: { title: "Hi", body: "yo", data: { k: "v" } },
    });
  });

  it("rejects sms without body", async () => {
    const { client } = stubClient();
    await expect(
      sendRawCommand.run({ channel: "sms", to: "+1" }, { client }),
    ).rejects.toThrow(/--body/);
  });

  it("builds a web-push request with icon, clickUrl, and data", async () => {
    const { client, calls } = stubClient();
    await sendRawCommand.run(
      {
        channel: "web-push",
        to: "{\"endpoint\":\"https://x\",\"keys\":{\"p256dh\":\"p\",\"auth\":\"a\"}}",
        title: "Hi",
        body: "yo",
        icon: "https://x/i.png",
        clickUrl: "https://x/go",
        pushData: { k: "v" },
      },
      { client },
    );
    expect(calls.sendRaw).toMatchObject({
      channel: "web-push",
      content: {
        title: "Hi",
        body: "yo",
        icon: "https://x/i.png",
        clickUrl: "https://x/go",
        data: { k: "v" },
      },
    });
  });

  it("rejects web-push without title/body", async () => {
    const { client } = stubClient();
    await expect(
      sendRawCommand.run({ channel: "web-push", to: "{}" }, { client }),
    ).rejects.toThrow(/--title and --body/);
  });
});

describe("read commands", () => {
  it("templates list formats a table", async () => {
    const { client } = stubClient();
    const out = await templatesListCommand.run({}, { client });
    expect(templatesListCommand.format(out)).toContain("welcome");
  });

  it("templates get passes the slug through", async () => {
    const { client, calls } = stubClient();
    await templatesGetCommand.run({ slug: "welcome" }, { client });
    expect(calls.getSlug).toBe("welcome");
  });

  it("messages list forwards filters", async () => {
    const { client, calls } = stubClient();
    await messagesListCommand.run({ status: "delivered", limit: 10 }, { client });
    expect(calls.listParams).toMatchObject({ status: "delivered", limit: 10 });
  });

  it("messages list forwards metadata filter", async () => {
    const { client, calls } = stubClient();
    await messagesListCommand.run(
      { metadata: { orderId: "123", tier: 1 } },
      { client },
    );
    expect(calls.listParams).toMatchObject({ metadata: { orderId: "123", tier: 1 } });
  });

  it("messages list parses metadata JSON from CLI string input", () => {
    const parsed = messagesListCommand.schema.parse({
      metadata: '{"orderId":"123","tier":1}',
    });
    expect(parsed.metadata).toEqual({ orderId: "123", tier: 1 });
  });

  it("messages get passes the id through and formats output", async () => {
    const { client, calls } = stubClient();
    const out = await messagesGetCommand.run({ id: "msg_abc" }, { client });
    expect(calls.getMessageId).toBe("msg_abc");
    const formatted = messagesGetCommand.format(out);
    expect(formatted).toContain("msg_abc");
    expect(formatted).toContain("delivered");
  });

  it("messages cancel passes the id and formats output", async () => {
    const { client, calls } = stubClient();
    const out = await messagesCancelCommand.run({ id: "msg_abc" }, { client });
    expect(calls.cancelMessageId).toBe("msg_abc");
    expect(out).toEqual({ id: "msg_abc", status: "canceled" });
    expect(messagesCancelCommand.format(out)).toContain("msg_abc");
  });
});

describe("context command", () => {
  it("reports the connected workspace + mode from client.context()", async () => {
    const { client } = stubClient();
    const out = await contextCommand.run({}, { client });
    expect(out).toEqual({
      workspace: { id: "ws_1", slug: "acme", name: "Acme Inc" },
      mode: "test",
    });
    const rendered = contextCommand.format(out);
    expect(rendered).toContain("Acme Inc");
    expect(rendered).toContain("acme");
    expect(rendered).toContain("test");
  });
});

describe("inbound addresses commands", () => {
  it("lists inbound addresses", async () => {
    const { client } = stubClient();
    const out = await inboundAddressesListCommand.run({}, { client });
    expect(out).toHaveLength(1);
    expect(inboundAddressesListCommand.format(out)).toContain(
      "support@acme.in.senderkit.email",
    );
  });

  it("creates an inbound address, threading fields through", async () => {
    const { client, calls } = stubClient();
    const out = await inboundAddressesCreateCommand.run(
      { localPart: "sales", forwardTo: "team@acme.com" },
      { client },
    );
    expect(calls.createInboundAddress).toMatchObject({
      localPart: "sales",
      forwardTo: "team@acme.com",
    });
    expect(inboundAddressesCreateCommand.format(out)).toContain("sales@acme.in.senderkit.email");
  });

  it("deletes an inbound address by id", async () => {
    const { client, calls } = stubClient();
    const out = await inboundAddressesDeleteCommand.run({ id: "inb_1" }, { client });
    expect(calls.deleteInboundAddressId).toBe("inb_1");
    expect(out).toEqual({ deleted: true });
    expect(inboundAddressesDeleteCommand.format(out)).toMatch(/Deleted/);
  });
});

describe("inbound messages commands", () => {
  it("lists received messages, threading filters through", async () => {
    const { client, calls } = stubClient();
    const out = await inboundMessagesListCommand.run(
      { limit: 5, address: "inb_1" },
      { client },
    );
    expect(calls.listInboundParams).toMatchObject({ limit: 5, address: "inb_1" });
    expect(out).toEqual([]);
    expect(inboundMessagesListCommand.format(out)).toContain("No received messages");
  });

  it("gets a received message by id", async () => {
    const { client, calls } = stubClient();
    const out = await inboundMessagesGetCommand.run({ id: "rcv_1" }, { client });
    expect(calls.getInboundMessageId).toBe("rcv_1");
    expect(out.id).toBe("rcv_1");
    expect(inboundMessagesGetCommand.format(out)).toContain("rcv_1");
  });
});
