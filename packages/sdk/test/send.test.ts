import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index";
import { createMockFetch } from "./helpers/mock-fetch";

describe("send", () => {
  it("posts to /api/v1/send with correct body and headers", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_abc", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_test_123",
      baseUrl: "https://api.example.com",
      fetch: mock.fetch,
    });

    const res = await sk.send({
      template: "welcome",
      to: "user@example.com",
      data: { name: "John" },
    });

    expect(res).toEqual({ id: "msg_abc", status: "queued", livemode: false });
    expect(mock.calls).toHaveLength(1);
    const call = mock.calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://api.example.com/api/v1/send");
    expect(call.headers["authorization"]).toBe("Bearer sk_test_123");
    expect(call.headers["content-type"]).toBe("application/json");
    expect(call.headers["user-agent"]).toMatch(/^senderkit-node\//);
    expect(call.headers["idempotency-key"]).toBeTruthy();
    expect(call.body).toEqual({
      template: "welcome",
      to: "user@example.com",
      vars: { name: "John" },
    });
  });

  it("translates data -> vars and omits empty data as {}", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: true } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_live_x", fetch: mock.fetch });
    await sk.send({ template: "ping", to: "a@b.com" });
    expect(mock.calls[0]!.body).toEqual({ template: "ping", to: "a@b.com", vars: {} });
  });

  it("uses caller idempotencyKey verbatim", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.send({
      template: "welcome",
      to: "user@example.com",
      idempotencyKey: "welcome-user-123",
    });
    expect(mock.calls[0]!.headers["idempotency-key"]).toBe("welcome-user-123");
  });

  it("auto-generates idempotencyKey when none provided", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_2", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.send({ template: "a", to: "x@x.com" });
    await sk.send({ template: "a", to: "x@x.com" });
    const k1 = mock.calls[0]!.headers["idempotency-key"];
    const k2 = mock.calls[1]!.headers["idempotency-key"];
    expect(k1).toBeTruthy();
    expect(k2).toBeTruthy();
    expect(k1).not.toBe(k2);
  });

  it("forwards channel and version when provided", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.send({
      template: "ping",
      to: "x@x.com",
      data: { v: 1 },
      channel: "email",
      version: 3,
    });
    expect(mock.calls[0]!.body).toEqual({
      template: "ping",
      to: "x@x.com",
      vars: { v: 1 },
      channel: "email",
      version: 3,
    });
  });

  it("forwards metadata when provided", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.send({
      template: "welcome",
      to: "user@example.com",
      metadata: { plan: "pro", count: 3, trial: false },
    });
    expect(mock.calls[0]!.body).toEqual({
      template: "welcome",
      to: "user@example.com",
      vars: {},
      metadata: { plan: "pro", count: 3, trial: false },
    });
  });

  it("throws when template or to is missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    // @ts-expect-error
    await expect(sk.send({ to: "x@x.com" })).rejects.toThrow(/template/);
    // @ts-expect-error
    await expect(sk.send({ template: "a" })).rejects.toThrow(/to/);
  });
});
