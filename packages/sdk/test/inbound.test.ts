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

describe("inbound.addresses custom domains + catch-all", () => {
  it("sends domainId, livemode, and a catch-all local part when provided", async () => {
    const mock = createMockFetch([
      { status: 201, body: { id: "inb_4", address: "*@inbound.acme.com" } },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const created = await sk.inbound.addresses.create({
      localPart: "*",
      domainId: "11111111-1111-1111-1111-111111111111",
      livemode: false,
    });
    expect(created.id).toBe("inb_4");
    expect(mock.calls[0]!.body).toEqual({
      localPart: "*",
      domainId: "11111111-1111-1111-1111-111111111111",
      livemode: false,
    });
  });
});

describe("inbound.domains", () => {
  it("lists domains from { domains: [...] }", async () => {
    const mock = createMockFetch([
      {
        status: 200,
        body: {
          domains: [
            { id: "d1", domain: "acme.in.senderkit.email", kind: "shared", status: "verified", records: [] },
            { id: "d2", domain: "inbound.acme.com", kind: "custom", status: "pending", records: [] },
          ],
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const list = await sk.inbound.domains.list();
    expect(list).toHaveLength(2);
    expect(list[1]!.domain).toBe("inbound.acme.com");
    expect(mock.calls[0]!.method).toBe("GET");
    expect(mock.calls[0]!.url).toContain("/v1/inbound/domains");
  });

  it("claims a domain and returns the DNS records to publish", async () => {
    const mock = createMockFetch([
      {
        status: 201,
        body: {
          id: "d3",
          domain: "inbound.acme.com",
          kind: "custom",
          status: "pending",
          records: [{ type: "MX", name: "inbound.acme.com", value: "inbound-smtp.senderkit.email", priority: 10, purpose: "receiving" }],
        },
      },
    ]);
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: mock.fetch });
    const created = await sk.inbound.domains.create({
      domain: "inbound.acme.com",
      acknowledgeExistingMx: true,
    });
    expect(created.records[0]!.type).toBe("MX");
    expect(mock.calls[0]!.method).toBe("POST");
    expect(mock.calls[0]!.body).toEqual({
      domain: "inbound.acme.com",
      acknowledgeExistingMx: true,
    });
  });

  it("throws when create domain missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    // @ts-expect-error exercising the runtime guard
    await expect(sk.inbound.domains.create({})).rejects.toThrow(/domain is required/);
  });

  it("deletes a domain by id with URL encoding", async () => {
    const mock = createMockFetch([{ status: 200, body: { deleted: true } }]);
    const sk = new SenderKit({
      apiKey: "sk_test_x",
      fetch: mock.fetch,
      baseUrl: "https://api.example.com",
    });
    const res = await sk.inbound.domains.delete("d 3");
    expect(res.deleted).toBe(true);
    expect(mock.calls[0]!.method).toBe("DELETE");
    expect(mock.calls[0]!.url).toBe("https://api.example.com/v1/inbound/domains/d%203");
  });

  it("throws when delete id missing", async () => {
    const sk = new SenderKit({ apiKey: "sk_test_x", fetch: createMockFetch().fetch });
    await expect(sk.inbound.domains.delete("")).rejects.toThrow(/id is required/);
  });
});
