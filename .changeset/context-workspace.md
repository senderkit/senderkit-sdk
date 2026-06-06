---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add `client.context()` (and the `SenderKitContext` type): fetches the connected
workspace `{ id, slug, name }` and send mode from `GET /v1/context`. The
`senderkit context` CLI command now reports the workspace name + slug instead of
just the mode, and the `senderkit_context` tool description mentions the
workspace.
