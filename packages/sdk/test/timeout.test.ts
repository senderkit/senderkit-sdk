import { describe, expect, it } from "vitest";
import { SenderKit, SenderKitTimeoutError } from "../src/index.js";
import { createMockFetch } from "./helpers/mock-fetch.js";

describe("timeout", () => {
  it("aborts and throws SenderKitTimeoutError when fetch exceeds timeout", async () => {
    const mock = createMockFetch([
      { delayMs: 200, status: 202, body: { id: "msg_x", status: "queued", livemode: false } },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      fetch: mock.fetch,
      timeout: 30,
      maxRetries: 0,
    });
    await expect(sk.send({ template: "a", to: "x@x.com" })).rejects.toBeInstanceOf(
      SenderKitTimeoutError,
    );
  });
});
