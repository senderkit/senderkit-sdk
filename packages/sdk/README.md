# @senderkit/sdk

Official TypeScript SDK for [SenderKit](https://senderkit.com) — notification infrastructure for modern SaaS apps. Send welcome emails, password resets, billing notifications, and other transactional messages with a single, predictable API.

- **ESM + CJS** dual-publish — works with `import` and `require`
- **Zero runtime dependencies**
- **Node.js 18+** (uses native `fetch`); runs on edge runtimes too via injectable `fetch`
- **Typed end-to-end** with generated `.d.ts` / `.d.cts`
- **Safe by default** — automatic retries, timeouts, and idempotency

## Install

```bash
npm install @senderkit/sdk
# or
pnpm add @senderkit/sdk
# or
bun add @senderkit/sdk
```

## Quick start

```ts
import { SenderKit } from "@senderkit/sdk";

const senderkit = new SenderKit({
  apiKey: process.env.SENDERKIT_API_KEY!,
});

await senderkit.send({
  template: "welcome",
  to: "user@example.com",
  vars: { name: "John" },
});
```

## Sending

### `send`

```ts
const { id } = await senderkit.send({
  template: "welcome",            // template slug
  to: "user@example.com",         // recipient
  vars: { name: "John" },        // template variables
  channel: "email",               // optional; defaults to template's primary channel
  idempotencyKey: "welcome-u123", // optional; prevents duplicate sends on retry
});
```

Defer delivery with `scheduledAt` — accepts an ISO 8601 string or a `Date`:

```ts
await senderkit.send({
  template: "trial-ending",
  to: "user@example.com",
  scheduledAt: "2026-06-01T09:00:00Z",
});
```

The response shape:

```ts
{ id: "msg_…", status: "queued" | "scheduled", livemode: boolean }
```

`status` is `"scheduled"` when `scheduledAt` is in the future, otherwise `"queued"`.

### `sendRaw`

Send inline content without registering a template — useful for one-off admin notifications, contact-form replies, AI-generated drafts, or any case where the body is known at call-time.

```ts
await senderkit.sendRaw({
  channel: "email",
  to: "user@example.com",
  content: {
    subject: "Your receipt",
    html: "<p>Thanks for your order.</p>",
  },
  metadata: { source: "checkout" },
});
```

SMS and push work the same way — switch the `channel` and the `content` shape:

```ts
await senderkit.sendRaw({
  channel: "sms",
  to: "+15555550123",
  content: { body: "Your code is 123456" },
});

await senderkit.sendRaw({
  channel: "push",
  to: "ExponentPushToken[xxx]",
  content: { title: "Shipped", body: "Tracking #ABC", badge: 1 },
});
```

Raw sends accept the same retry, idempotency, and error-handling behavior as template sends. Pass `interpolate: true` together with `vars` to opt into server-side variable substitution inside `content`. Add `scheduledAt` to defer delivery, same as with `send`.

### `sendBatch`

Fan out many messages at once. Returns one result per item — failures don't abort the batch. A batch can mix template and raw items freely.

```ts
const results = await senderkit.sendBatch([
  { template: "welcome", to: "user1@example.com", vars: { name: "John" } },
  { template: "trial-ending", to: "user2@example.com", vars: { daysLeft: 3 } },
]);

for (const r of results) {
  if (r.ok) console.log("sent", r.id);
  else console.error("failed", r.index, r.error.message);
}
```

Options:

```ts
await senderkit.sendBatch(messages, {
  concurrency: 5,             // max parallel requests (default 5)
  idempotencyKey: "cohort-1", // each item gets `cohort-1-0`, `cohort-1-1`, …
});
```

## Live vs test mode

The mode is encoded in your API key — no flag to set:

- `sk_live_…` → production / live mode
- `sk_test_…` → test mode

Switch environments by swapping the key.

## Idempotency

Every `send` call includes an `Idempotency-Key` header. If you don't pass one, the SDK auto-generates a UUID per call so transparent retries (network blips, 429s, 5xx) never duplicate a send. Pass your own key when you need end-to-end deduplication across your own retries:

```ts
await senderkit.send({
  template: "invoice-paid",
  to: "user@example.com",
  vars: { invoice: "inv_123" },
  idempotencyKey: `invoice-paid:inv_123`,
});
```

## Error handling

All errors extend `SenderKitError`. Use `instanceof` to branch:

```ts
import {
  SenderKitAuthenticationError,
  SenderKitNetworkError,
  SenderKitRateLimitError,
  SenderKitTimeoutError,
  SenderKitValidationError,
} from "@senderkit/sdk";

try {
  await senderkit.send({ template: "welcome", to: "user@example.com" });
} catch (err) {
  if (err instanceof SenderKitValidationError) {
    console.error("Bad request:", err.message, err.issues);
  } else if (err instanceof SenderKitAuthenticationError) {
    console.error("Check your API key");
  } else if (err instanceof SenderKitRateLimitError) {
    console.warn(`Rate limited, retry after ${err.retryAfter}ms`);
  } else if (err instanceof SenderKitTimeoutError) {
    console.warn("Request timed out");
  } else if (err instanceof SenderKitNetworkError) {
    console.warn("Network error", err.cause);
  } else {
    throw err;
  }
}
```

| Class | When it fires |
| --- | --- |
| `SenderKitValidationError` | 400 / 422 — invalid request, includes `issues` from the API |
| `SenderKitAuthenticationError` | 401 / 403 — missing or invalid API key |
| `SenderKitRateLimitError` | 429 — includes `retryAfter` (ms) |
| `SenderKitApiError` | other 4xx / 5xx after retries are exhausted |
| `SenderKitTimeoutError` | request exceeded the configured `timeout` |
| `SenderKitNetworkError` | fetch threw (DNS, connection refused, …) |
| `SenderKitError` | base class — catch this to handle them all |

## Templates and messages

```ts
const templates = await senderkit.templates.list();
const welcome = await senderkit.templates.get("welcome");

const { data, nextCursor } = await senderkit.messages.list({
  limit: 50,
  status: "delivered",
  template: "welcome",
});

const message = await senderkit.messages.get("msg_…");
```

## Next.js route handler

```ts
// app/api/welcome/route.ts
import { NextResponse } from "next/server";
import { SenderKit } from "@senderkit/sdk";

const senderkit = new SenderKit({ apiKey: process.env.SENDERKIT_API_KEY! });

export async function POST(req: Request) {
  const { email, name } = (await req.json()) as { email: string; name: string };
  const result = await senderkit.send({
    template: "welcome",
    to: email,
    vars: { name },
    idempotencyKey: `welcome:${email}`,
  });
  return NextResponse.json(result, { status: 202 });
}
```

## React Email

Use [`@senderkit/react-email`](../react-email) to wrap React Email components with SenderKit metadata (id, subject, preview data, optional schema) and render them to HTML. The two packages are designed to be used together.

## API reference

### `new SenderKit(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | — | **Required.** `sk_live_…` or `sk_test_…`. |
| `baseUrl` | `string` | `https://senderkit.com/api` | Override the API endpoint. |
| `timeout` | `number` | `30000` | Per-request timeout in ms. |
| `maxRetries` | `number` | `2` | Retries on network / timeout / 429 / 5xx. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Inject a custom fetch (tests, edge runtimes). |

### Methods

| Method | Returns |
| --- | --- |
| `send(request)` | `Promise<SendResponse>` |
| `sendRaw(request)` | `Promise<SendResponse>` |
| `sendBatch(requests, options?)` | `Promise<BatchSendResult[]>` |
| `templates.list()` | `Promise<Template[]>` |
| `templates.get(slug)` | `Promise<Template>` |
| `messages.list(params?)` | `Promise<{ data: Message[]; nextCursor: string \| null }>` |
| `messages.get(id)` | `Promise<Message>` |

## License

MIT
