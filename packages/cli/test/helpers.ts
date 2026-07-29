import type { SenderKit } from "@senderkit/sdk";

export interface StubCalls {
  send?: unknown;
  sendRaw?: unknown;
  getSlug?: string;
  listParams?: unknown;
  getMessageId?: string;
  cancelMessageId?: string;
  createInboundAddress?: unknown;
  deleteInboundAddressId?: string;
  listInboundParams?: unknown;
  getInboundMessageId?: string;
}

const queued = { id: "msg_x", status: "queued" as const, livemode: false };

/** A minimal SenderKit stand-in that records calls. */
export function stubClient(): { client: SenderKit; calls: StubCalls } {
  const calls: StubCalls = {};
  const client = {
    send: async (req: unknown) => {
      calls.send = req;
      return queued;
    },
    sendRaw: async (req: unknown) => {
      calls.sendRaw = req;
      return queued;
    },
    templates: {
      list: async () => [
        {
          slug: "welcome",
          channel: "email",
          description: "Welcome email",
          status: "published",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      get: async (slug: string) => {
        calls.getSlug = slug;
        return {
          slug,
          channel: "email",
          description: "Welcome email",
          status: "published",
          updatedAt: "2026-01-01T00:00:00Z",
          currentVersion: {
            versionNumber: 2,
            variables: [],
            publishedAt: "2026-01-01T00:00:00Z",
          },
        };
      },
    },
    messages: {
      list: async (params: unknown) => {
        calls.listParams = params;
        return { data: [], nextCursor: null };
      },
      get: async (id: string) => {
        calls.getMessageId = id;
        return {
          id: "internal_1",
          publicId: id,
          status: "delivered",
          channel: "email",
          templateSlug: "welcome",
          recipient: "a@b.com",
          createdAt: "2026-05-10T00:00:00Z",
        };
      },
      cancel: async (id: string) => {
        calls.cancelMessageId = id;
        return { id, status: "canceled" as const };
      },
    },
    inbound: {
      addresses: {
        list: async () => [
          {
            id: "inb_1",
            address: "support@acme.in.senderkit.email",
            description: "Support intake",
            forwardTo: null,
            active: true,
            livemode: false,
            createdAt: "2026-05-10T00:00:00Z",
          },
        ],
        create: async (params: unknown) => {
          calls.createInboundAddress = params;
          return {
            id: "inb_2",
            address: "sales@acme.in.senderkit.email",
            description: null,
            forwardTo: null,
            active: true,
            livemode: false,
            createdAt: "2026-05-10T00:00:00Z",
          };
        },
        delete: async (id: string) => {
          calls.deleteInboundAddressId = id;
          return { deleted: true as const };
        },
      },
      messages: {
        list: async (params: unknown) => {
          calls.listInboundParams = params;
          return [];
        },
        get: async (id: string) => {
          calls.getInboundMessageId = id;
          return {
            id,
            status: "received",
            channel: "email",
            address: "support@acme.in.senderkit.email",
            plusTag: null,
            from: { email: "sender@example.com", name: "Sender" },
            to: [],
            cc: [],
            envelope: { from: "sender@example.com", to: [] },
            subject: "Hello",
            messageId: null,
            inReplyTo: null,
            text: "Hi",
            html: null,
            strippedReply: "Hi",
            truncated: false,
            headers: {},
            attachments: [],
            verdicts: {},
            sizeBytes: 42,
            rawUrl: "https://api.senderkit.com/v1/inbound/messages/" + id + "/raw",
            receivedAt: "2026-05-10T00:00:00Z",
          };
        },
      },
    },
    context: async () => ({
      workspace: { id: "ws_1", slug: "acme", name: "Acme Inc" },
      mode: "test" as const,
    }),
  } as unknown as SenderKit;
  return { client, calls };
}
