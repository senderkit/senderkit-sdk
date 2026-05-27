import { describe, expect, it } from "vitest";
import {
  SenderKit,
  SenderKitApiError,
  SenderKitAuthenticationError,
  SenderKitRateLimitError,
  SenderKitValidationError,
} from "../src/index.js";
import { createMockFetch } from "./helpers/mock-fetch.js";

describe("error mapping", () => {
  it("maps 400 to SenderKitValidationError with issues preserved", async () => {
    const mock = createMockFetch([
      {
        status: 400,
        body: {
          error: { code: "invalid_request", message: "Bad input", issues: [{ path: ["to"] }] },
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 0 });
    const err = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(SenderKitValidationError);
    expect(err.status).toBe(400);
    expect(err.code).toBe("invalid_request");
    expect(err.issues).toEqual([{ path: ["to"] }]);
  });

  it("maps 401 to SenderKitAuthenticationError", async () => {
    const mock = createMockFetch([
      { status: 401, body: { error: { code: "unauthenticated", message: "Bad key" } } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 0 });
    const err = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(SenderKitAuthenticationError);
    expect(err.status).toBe(401);
  });

  it("maps 429 to SenderKitRateLimitError with retryAfter in ms", async () => {
    const mock = createMockFetch([
      {
        status: 429,
        headers: { "retry-after": "2" },
        body: { error: { code: "rate_limited", message: "Slow down" } },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 0 });
    const err = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(SenderKitRateLimitError);
    expect(err.retryAfter).toBe(2000);
  });

  it("maps 404 to base SenderKitApiError", async () => {
    const mock = createMockFetch([
      { status: 404, body: { error: { code: "not_found", message: "no template" } } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 0 });
    const err = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(SenderKitApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
  });

  it("falls back to default message when error body is missing", async () => {
    const mock = createMockFetch([{ status: 418, body: "" }]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch, maxRetries: 0 });
    const err = await sk.send({ template: "a", to: "x@x.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(SenderKitApiError);
    expect(err.message).toMatch(/418/);
  });
});
