import { describe, expect, it } from "vitest";
import { SenderKit, SenderKitNetworkError, SenderKitValidationError } from "../src/index";
import { createMockFetch } from "./helpers/mock-fetch";

describe("retries", () => {
  it("retries on 500 and succeeds on second attempt", async () => {
    const mock = createMockFetch([
      { status: 500, body: { error: { code: "server_error", message: "boom" } } },
      { status: 202, body: { id: "msg_ok", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 2 });
    const res = await sk.send({ template: "a", to: "x@x.com" });
    expect(res.id).toBe("msg_ok");
    expect(mock.calls).toHaveLength(2);
  });

  it("retries on 429 then succeeds", async () => {
    const mock = createMockFetch([
      {
        status: 429,
        headers: { "retry-after": "0" },
        body: { error: { code: "rate_limited", message: "slow" } },
      },
      { status: 202, body: { id: "msg_ok", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 2 });
    const res = await sk.send({ template: "a", to: "x@x.com" });
    expect(res.id).toBe("msg_ok");
    expect(mock.calls).toHaveLength(2);
  });

  it("does NOT retry on 400", async () => {
    const mock = createMockFetch([
      { status: 400, body: { error: { code: "bad", message: "no" } } },
      { status: 202, body: { id: "msg_unexpected", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 3 });
    await expect(sk.send({ template: "a", to: "x@x.com" })).rejects.toBeInstanceOf(
      SenderKitValidationError,
    );
    expect(mock.calls).toHaveLength(1);
  });

  it("retries on network error and surfaces NetworkError when budget exhausted", async () => {
    const err = new Error("ECONNREFUSED");
    const mock = createMockFetch([{ throw: err }, { throw: err }, { throw: err }]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 2 });
    const result = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(result).toBeInstanceOf(SenderKitNetworkError);
    expect(mock.calls).toHaveLength(3);
  });

  it("stops retrying after maxRetries on 500", async () => {
    const mock = createMockFetch([
      { status: 500, body: { error: { message: "x" } } },
      { status: 500, body: { error: { message: "x" } } },
      { status: 500, body: { error: { message: "x" } } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 2 });
    await expect(sk.send({ template: "a", to: "x@x.com" })).rejects.toThrow();
    expect(mock.calls).toHaveLength(3);
  });
});
