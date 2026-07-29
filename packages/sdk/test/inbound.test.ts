import { describe, expect, it } from "vitest";
import { SenderKit } from "../src/index";
import { createMockFetch } from "./helpers/mock-fetch";

describe("inbound.addresses", () => {
  it("lists addresses from { addresses: [...] }", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: {
          addresses: [
            { id: "inb_1", address: "support@acme.in.senderkit.email", active: true },
            { id: "inb_2", address: "sales@acme.in.senderkit.email", active: true },
          ],
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const list = await sk.inbound.addresses.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe("inb_1");
    expect(mock.calls[0]!.method).toBe("GET");
    expect(mock.calls[0]!.url).toContain("/v1/inbound/addresses");
  });

  it("creates an address, sending only provided fields", async () => {
    const mock = createMockFetch([
      { status: 201, body: { id: "inb_3", address: "support@acme.in.senderkit.email" } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const created = await sk.inbound.addresses.create({ localPart: "support" });
    expect(created.id).toBe("inb_3");
    expect(mock.calls[0]!.method).toBe("POST");
    expect(mock.calls[0]!.body).toEqual({ localPart: "support" });
  });

  it("deletes an address by id with URL encoding", async () => {
    const mock = createMockFetch([{ status: 200, body: { deleted: true } }]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      fetch: mock.fetch,
      baseUrl: "https://api.example.com",
    });
    const res = await sk.inbound.addresses.delete("inb_a+1");
    expect(res.deleted).toBe(true);
    expect(mock.calls[0]!.method).toBe("DELETE");
    expect(mock.calls[0]!.url).toBe("https://api.example.com/v1/inbound/addresses/inb_a%2B1");
  });

  it("throws when delete id missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    await expect(sk.inbound.addresses.delete("")).rejects.toThrow(/id is required/);
  });
});

describe("inbound.messages", () => {
  it("lists messages from { messages: [...] } with query params", async () => {
    const mock = createMockFetch([
      { status: 200, body: { messages: [{ id: "rcv_1", status: "received" }] } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const list = await sk.inbound.messages.list({
      limit: 10,
      before: new Date("2026-05-10T00:00:00Z"),
      address: "inb_1",
    });
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("rcv_1");
    const url = mock.calls[0]!.url;
    expect(url).toMatch(/limit=10/);
    expect(url).toContain("before=2026-05-10T00%3A00%3A00.000Z");
    expect(url).toMatch(/address=inb_1/);
  });

  it("gets a received message by id", async () => {
    const mock = createMockFetch([
      { status: 200, body: { id: "rcv_1", status: "received", subject: "Hi" } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const msg = await sk.inbound.messages.get("rcv_1");
    expect(msg.subject).toBe("Hi");
    expect(mock.calls[0]!.url).toContain("/v1/inbound/messages/rcv_1");
  });

  it("fetches raw MIME as bytes with the right Accept header", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: "From: a@b.com\r\nSubject: Hi\r\n\r\nBody",
        headers: { "content-type": "message/rfc822" },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const raw = await sk.inbound.messages.raw("rcv_1");
    expect(raw.contentType).toBe("message/rfc822");
    expect(new TextDecoder().decode(raw.data)).toContain("Subject: Hi");
    expect(mock.calls[0]!.headers["accept"]).toBe("message/rfc822");
    expect(mock.calls[0]!.url).toContain("/v1/inbound/messages/rcv_1/raw");
  });

  it("fetches an attachment by index, parsing the filename", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: "PDFBYTES",
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=\"invoice.pdf\"",
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const att = await sk.inbound.messages.attachment("rcv_1", 0);
    expect(att.contentType).toBe("application/pdf");
    expect(att.filename).toBe("invoice.pdf");
    expect(mock.calls[0]!.url).toContain("/v1/inbound/messages/rcv_1/attachments/0");
  });

  it("rejects a negative attachment index without a request", async () => {
    const mock = createMockFetch();
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    await expect(sk.inbound.messages.attachment("rcv_1", -1)).rejects.toThrow(
      /non-negative integer/,
    );
    expect(mock.calls).toHaveLength(0);
  });
});
