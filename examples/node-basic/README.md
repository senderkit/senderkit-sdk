# node-basic example

Minimal Node.js script that sends a transactional message via `@senderkit/sdk`.

## Run

```bash
pnpm install            # at the repo root
pnpm --filter @senderkit/sdk build

cd examples/node-basic
SENDERKIT_API_KEY=sk_test_… TO=you@example.com NAME=Anton pnpm start
```

Optional env:

- `SENDERKIT_BASE_URL` — override the API endpoint (e.g. `http://localhost:3000` when running the SenderKit backend locally).
- `TO` — recipient email (default `user@example.com`).
- `NAME` — `name` variable passed to the `welcome` template.
