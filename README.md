# SenderKit SDK

Official TypeScript SDK for [SenderKit](https://senderkit.com) — notification infrastructure for modern SaaS apps.

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

## License

MIT
