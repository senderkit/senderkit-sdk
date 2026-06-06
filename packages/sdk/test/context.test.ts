import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index";
import { createMockFetch } from "./helpers/mock-fetch";

describe("context", () => {
  it("fetches workspace + mode from /v1/context", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: {
          workspace: { id: "ws_1", slug: "acme", name: "Acme Inc" },
          mode: "live",
        },
      },
    ]);
    const sk = new SenderKit({
      apiKey: "sk_live_x",
      fetch: mock.fetch,
      baseUrl: "https://api.example.com",
    });
    const ctx = await sk.context();
    expect(ctx.workspace.slug).toBe("acme");
    expect(ctx.mode).toBe("live");
    expect(mock.calls[0]!.method).toBe("GET");
    expect(mock.calls[0]!.url).toBe("https://api.example.com/v1/context");
  });
});
