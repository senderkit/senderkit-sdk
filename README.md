# SenderKit SDK

Official TypeScript SDK for [SenderKit](https://senderkit.com) — notification infrastructure for modern SaaS apps. Send welcome emails, password resets, billing notifications, and other transactional messages with a single, predictable API.

[![@senderkit/sdk](https://img.shields.io/npm/v/@senderkit/sdk?label=%40senderkit%2Fsdk)](https://www.npmjs.com/package/@senderkit/sdk)
[![@senderkit/cli](https://img.shields.io/npm/v/@senderkit/cli?label=%40senderkit%2Fcli)](https://www.npmjs.com/package/@senderkit/cli)
[![@senderkit/react-email](https://img.shields.io/npm/v/@senderkit/react-email?label=%40senderkit%2Freact-email)](https://www.npmjs.com/package/@senderkit/react-email)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

- **ESM + CJS** dual-publish — works with `import` and `require`
- **Zero runtime dependencies** in the core SDK
- **Node.js 18+** (uses native `fetch`); runs on edge runtimes too via injectable `fetch`
- **Typed end-to-end** with generated `.d.ts` / `.d.cts`
- **Safe by default** — automatic retries, timeouts, and idempotency
- **Terminal & AI-native** — a CLI and an MCP server for use from your shell or AI assistant

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
  data: { name: "John" },
});
```

## Packages

| Package | Description |
| --- | --- |
| [`@senderkit/sdk`](./packages/sdk) | Core TypeScript SDK. Node.js 18+, ESM-first, zero runtime dependencies. |
| [`@senderkit/cli`](./packages/cli) | Command-line interface and MCP server. Send notifications and inspect templates/messages from your terminal or AI assistant. |
| [`@senderkit/react-email`](./packages/react-email) | Bridge React Email templates to SenderKit — metadata, preview data, payload typing, manifest generation. |

## Examples

| Example | Description |
| --- | --- |
| [`node-basic`](./examples/node-basic) | Send a transactional message from a plain Node.js script. |
| [`nextjs-basic`](./examples/nextjs-basic) | Drop the SDK into a Next.js App Router route handler. |

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev loop and how to add a changeset. To report a security issue, see [SECURITY.md](./SECURITY.md).

## License

MIT — see [LICENSE](./LICENSE).
