import type { SenderKit } from "@senderkit/sdk";

export interface StubCalls {
  send?: unknown;
  sendRaw?: unknown;
  getSlug?: string;
  listParams?: unknown;
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
            content: {},
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
    },
  } as unknown as SenderKit;
  return { client, calls };
}
