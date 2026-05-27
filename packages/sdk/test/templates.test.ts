import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index.js";
import { createMockFetch } from "./helpers/mock-fetch.js";

describe("templates", () => {
  it("lists templates from { data: [...] }", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: {
          data: [
            { slug: "welcome", name: "Welcome", channels: ["email"] },
            { slug: "trial-ending", name: "Trial ending", channels: ["email"] },
          ],
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const list = await sk.templates.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.slug).toBe("welcome");
    expect(mock.calls[0]!.method).toBe("GET");
    expect(mock.calls[0]!.url).toContain("/api/v1/templates");
  });

  it("lists templates from bare array response", async () => {
    const mock = createMockFetch([
      { status: 200, body: [{ slug: "x", name: "X", channels: ["email"] }] },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const list = await sk.templates.list();
    expect(list).toHaveLength(1);
  });

  it("gets a template by slug with URL encoding", async () => {
    const mock = createMockFetch([
      { status: 200, body: { slug: "welcome+v2", name: "Welcome v2", channels: ["email"] } },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      fetch: mock.fetch,
      baseUrl: "https://api.example.com",
    });
    const tpl = await sk.templates.get("welcome+v2");
    expect(tpl.slug).toBe("welcome+v2");
    expect(mock.calls[0]!.url).toBe("https://api.example.com/api/v1/templates/welcome%2Bv2");
  });

  it("throws when slug missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    await expect(sk.templates.get("")).rejects.toThrow(/slug is required/);
  });
});

describe("messages", () => {
  it("lists messages and normalizes cursor field", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: {
          data: [
            {
              id: "msg_1",
              status: "delivered",
              channel: "email",
              template: "welcome",
              to: "a@b.com",
              createdAt: "2026-05-10T00:00:00Z",
            },
          ],
          next_cursor: "abc",
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const res = await sk.messages.list({ limit: 10, status: "delivered" });
    expect(res.data).toHaveLength(1);
    expect(res.nextCursor).toBe("abc");
    expect(mock.calls[0]!.url).toMatch(/limit=10/);
    expect(mock.calls[0]!.url).toMatch(/status=delivered/);
  });

  it("nextCursor null when absent", async () => {
    const mock = createMockFetch([{ status: 200, body: { data: [] } }]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const res = await sk.messages.list();
    expect(res.nextCursor).toBeNull();
  });
});
