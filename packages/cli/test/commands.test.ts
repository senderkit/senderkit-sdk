import { describe, expect, it } from "vitest";
import { sendCommand } from "../src/core/commands/send";
import { sendRawCommand } from "../src/core/commands/send-raw";
import { templatesListCommand } from "../src/core/commands/templates-list";
import { templatesGetCommand } from "../src/core/commands/templates-get";
import { messagesListCommand } from "../src/core/commands/messages-list";
import { messagesGetCommand } from "../src/core/commands/messages-get";
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
});
