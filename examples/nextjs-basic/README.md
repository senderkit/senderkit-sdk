# nextjs-basic example

Next.js App Router route handler that sends a welcome email via `@senderkit/sdk`.

## Run

```bash
pnpm install              # at the repo root
pnpm --filter @senderkit/sdk build

cd examples/nextjs-basic
SENDERKIT_API_KEY=sk_test_… pnpm dev
```

Trigger the route:

```bash
curl -X POST http://localhost:3000/api/welcome \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","name":"Anton"}'
```

## Files

- `app/api/welcome/route.ts` — the route handler.
