import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index.js";
import { createMockFetch } from "./helpers/mock-fetch.js";

describe("SenderKit constructor", () => {
  it("throws when apiKey is missing", () => {
    // @ts-expect-error — intentionally invalid
    expect(() => new SenderKit({})).toThrow(/apiKey is required/);
  });

  it("throws when options is missing", () => {
    // @ts-expect-error — intentionally invalid
    expect(() => new SenderKit()).toThrow();
  });

  it("accepts a custom fetch", () => {
    const mock = createMockFetch();
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    expect(sk).toBeInstanceOf(SenderKit);
    expect(sk.templates).toBeDefined();
    expect(sk.messages).toBeDefined();
  });

  it("exposes resource namespaces", () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    expect(typeof sk.send).toBe("function");
    expect(typeof sk.sendBatch).toBe("function");
    expect(typeof sk.templates.list).toBe("function");
    expect(typeof sk.templates.get).toBe("function");
    expect(typeof sk.messages.list).toBe("function");
  });
});
