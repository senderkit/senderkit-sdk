import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index";
import { createMockFetch } from "./helpers/mock-fetch";

describe("sendRaw", () => {
  it("posts a minimal raw email to /v1/send", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_raw1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      baseUrl: "https://api.example.com",
      fetch: mock.fetch,
    });

    const res = await sk.sendRaw({
      channel: "email",
      to: "user@example.com",
      content: {
        subject: "Hi",
        html: "<p>hello</p>",
      },
    });

    expect(res).toEqual({ id: "msg_raw1", status: "queued", livemode: false });
    expect(mock.calls).toHaveLength(1);
    const call = mock.calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://api.example.com/v1/send");
    expect(call.headers["authorization"]).toBe("Bearer sk_test_x");
    expect(call.headers["idempotency-key"]).toBeTruthy();
    expect(call.body).toEqual({
      channel: "email",
      to: "user@example.com",
      content: { subject: "Hi", html: "<p>hello</p>" },
      vars: {},
    });
  });

  it("forwards from, metadata, interpolate, and full email content", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: true } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_live_x", fetch: mock.fetch });

    await sk.sendRaw({
      channel: "email",
      to: "user@example.com",
      content: {
        subject: "Hi {{name}}",
        preheader: "Preview text",
        html: "<p>Hello {{name}}</p>",
        text: "Hello {{name}}",
      },
      from: "no-reply@example.com",
      fromName: "Acme Support",
      vars: { name: "Ada" },
      metadata: { source: "test", attempt: 1 },
      interpolate: true,
    });

    expect(mock.calls[0]!.body).toEqual({
      channel: "email",
      to: "user@example.com",
      content: {
        subject: "Hi {{name}}",
        preheader: "Preview text",
        html: "<p>Hello {{name}}</p>",
        text: "Hello {{name}}",
      },
      vars: { name: "Ada" },
      metadata: { source: "test", attempt: 1 },
      interpolate: true,
      from: "no-reply@example.com",
      fromName: "Acme Support",
    });
  });

  it("sends a raw SMS", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_sms", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    await sk.sendRaw({
      channel: "sms",
      to: "+15555550123",
      content: { body: "code 123" },
    });

    expect(mock.calls[0]!.body).toEqual({
      channel: "sms",
      to: "+15555550123",
      content: { body: "code 123" },
      vars: {},
    });
  });

  it("sends a raw push notification with all optional fields", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_push", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    await sk.sendRaw({
      channel: "push",
      to: "ExponentPushToken[xxx]",
      content: {
        title: "Shipped",
        body: "Tracking #ABC",
        data: { orderId: "abc" },
        badge: 1,
        sound: "default",
      },
    });

    expect(mock.calls[0]!.body).toEqual({
      channel: "push",
      to: "ExponentPushToken[xxx]",
      content: {
        title: "Shipped",
        body: "Tracking #ABC",
        data: { orderId: "abc" },
        badge: 1,
        sound: "default",
      },
      vars: {},
    });
  });

  it("sends a raw web-push notification with all optional fields", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_wp", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    const subscription = JSON.stringify({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "p", auth: "a" },
    });

    await sk.sendRaw({
      channel: "web-push",
      to: subscription,
      content: {
        title: "Back in stock",
        body: "The item you wanted is available.",
        icon: "https://app.example.com/icon-192.png",
        clickUrl: "https://app.example.com/product/42",
        data: { productId: "42" },
        badge: 1,
      },
    });

    expect(mock.calls[0]!.body).toEqual({
      channel: "web-push",
      to: subscription,
      content: {
        title: "Back in stock",
        body: "The item you wanted is available.",
        icon: "https://app.example.com/icon-192.png",
        clickUrl: "https://app.example.com/product/42",
        data: { productId: "42" },
        badge: 1,
      },
      vars: {},
    });
  });

  it("does not include `from`/`fromName` for non-email channels", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_sms", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    // Cast-through to verify the runtime guard rejects stray From overrides on SMS.
    await sk.sendRaw({
      channel: "sms",
      to: "+15555550123",
      content: { body: "hello" },
      // @ts-expect-error from and fromName are email-only
      from: "no-reply@example.com",
      fromName: "Acme Support",
    });

    expect(mock.calls[0]!.body).not.toHaveProperty("from");
    expect(mock.calls[0]!.body).not.toHaveProperty("fromName");
  });

  it("uses caller idempotencyKey verbatim", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    await sk.sendRaw({
      channel: "email",
      to: "user@example.com",
      content: { subject: "Hi", html: "<p>x</p>" },
      idempotencyKey: "contact-form-42",
    });

    expect(mock.calls[0]!.headers["idempotency-key"]).toBe("contact-form-42");
  });

  it("auto-generates a unique idempotencyKey per call when omitted", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_2", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.sendRaw({
      channel: "email",
      to: "a@x.com",
      content: { subject: "Hi", html: "<p>1</p>" },
    });
    await sk.sendRaw({
      channel: "email",
      to: "a@x.com",
      content: { subject: "Hi", html: "<p>2</p>" },
    });
    const k1 = mock.calls[0]!.headers["idempotency-key"];
    const k2 = mock.calls[1]!.headers["idempotency-key"];
    expect(k1).toBeTruthy();
    expect(k2).toBeTruthy();
    expect(k1).not.toBe(k2);
  });

  it("forwards scheduledAt verbatim and serializes Date to ISO 8601", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_2", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    await sk.sendRaw({
      channel: "email",
      to: "user@example.com",
      content: { subject: "Hi", html: "<p>x</p>" },
      scheduledAt: "2026-06-01T09:00:00Z",
    });
    expect(mock.calls[0]!.body).toMatchObject({ scheduledAt: "2026-06-01T09:00:00Z" });

    await sk.sendRaw({
      channel: "sms",
      to: "+15555550123",
      content: { body: "hi" },
      scheduledAt: new Date("2026-06-01T09:00:00Z"),
    });
    expect(mock.calls[1]!.body).toMatchObject({ scheduledAt: "2026-06-01T09:00:00.000Z" });
  });

  it("omits scheduledAt from the body when not provided", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.sendRaw({
      channel: "sms",
      to: "+15555550123",
      content: { body: "hi" },
    });
    expect(mock.calls[0]!.body).not.toHaveProperty("scheduledAt");
  });

  it("throws when to, channel, or content is missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    await expect(
      // @ts-expect-error to required
      sk.sendRaw({ channel: "email", content: { subject: "x", html: "<p/>" } }),
    ).rejects.toThrow(/to/);
    await expect(
      // @ts-expect-error channel required
      sk.sendRaw({ to: "x@x.com", content: { subject: "x", html: "<p/>" } }),
    ).rejects.toThrow(/channel/);
    await expect(
      // @ts-expect-error content required
      sk.sendRaw({ channel: "email", to: "x@x.com" }),
    ).rejects.toThrow(/content/);
  });
});
