import { describe, expect, it } from "vitest";
import { SenderKit, SenderKitValidationError } from "../src/index.js";
import { createMockFetch } from "./helpers/mock-fetch.js";

describe("sendBatch", () => {
  it("returns empty array for empty input", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    const results = await sk.sendBatch([]);
    expect(results).toEqual([]);
  });

  it("sends all items and returns mixed result array", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 400, body: { error: { code: "bad", message: "no" } } },
      { status: 202, body: { id: "msg_3", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      fetch: mock.fetch,
      maxRetries: 0,
    });

    const results = await sk.sendBatch(
      [
        { template: "a", to: "1@x.com" },
        { template: "b", to: "2@x.com" },
        { template: "c", to: "3@x.com" },
      ],
      { concurrency: 1 },
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ ok: true, index: 0, id: "msg_1" });
    expect(results[1]).toMatchObject({ ok: false, index: 1 });
    if (!results[1]!.ok) {
      expect(results[1]!.error).toBeInstanceOf(SenderKitValidationError);
    }
    expect(results[2]).toMatchObject({ ok: true, index: 2, id: "msg_3" });
  });

  it("derives per-item idempotency keys from batch idempotencyKey", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_2", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.sendBatch(
      [
        { template: "a", to: "1@x.com" },
        { template: "a", to: "2@x.com" },
      ],
      { idempotencyKey: "welcome-cohort", concurrency: 1 },
    );
    expect(mock.calls[0]!.headers["idempotency-key"]).toBe("welcome-cohort-0");
    expect(mock.calls[1]!.headers["idempotency-key"]).toBe("welcome-cohort-1");
  });

  it("dispatches a mixed batch of template and raw requests", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_tmpl", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_raw", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });

    const results = await sk.sendBatch(
      [
        { template: "welcome", to: "1@x.com", data: { name: "A" } },
        {
          channel: "email",
          to: "2@x.com",
          content: { subject: "Hi", html: "<p>hello</p>" },
        },
      ],
      { concurrency: 1 },
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ok: true, index: 0, id: "msg_tmpl" });
    expect(results[1]).toMatchObject({ ok: true, index: 1, id: "msg_raw" });
    expect(mock.calls[0]!.body).toEqual({
      template: "welcome",
      to: "1@x.com",
      vars: { name: "A" },
    });
    expect(mock.calls[1]!.body).toEqual({
      channel: "email",
      to: "2@x.com",
      content: { subject: "Hi", html: "<p>hello</p>" },
      vars: {},
    });
  });

  it("per-item idempotencyKey overrides batch-derived key", async () => {
    const mock = createMockFetch([
      { status: 202, body: { id: "msg_1", status: "queued", livemode: false } },
      { status: 202, body: { id: "msg_2", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await sk.sendBatch(
      [
        { template: "a", to: "1@x.com", idempotencyKey: "explicit-0" },
        { template: "a", to: "2@x.com" },
      ],
      { idempotencyKey: "batch", concurrency: 1 },
    );
    expect(mock.calls[0]!.headers["idempotency-key"]).toBe("explicit-0");
    expect(mock.calls[1]!.headers["idempotency-key"]).toBe("batch-1");
  });
});
