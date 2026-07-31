---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

MCP manifest fixes from the 2026-07-31 connectors-directory audit — the shared
manifest now states the real wire contract, so the hosted server no longer needs
app-side overrides for these:

- **`ToolAnnotations` widened to admit non-destructive writes.** The union was
  `readOnlyHint: true` XOR `destructiveHint: true`, but MCP also has additive,
  non-destructive writes (`destructiveHint: false`) — e.g. the app's
  `templates_create` / `inbound_addresses_create`. `destructiveHint` now accepts
  either boolean (still exactly one hint per tool).
- **cc/bcc descriptions no longer leak CLI input conventions.** On the MCP wire
  these fields are plain JSON arrays; "(CLI: comma-separated or JSON array)" is
  gone from the manifest, and the schema now also enforces the API's 50-recipient
  cap (`maxItems: 50`). The CLI keeps documenting comma-separated input in its
  own flag help via the new `Command.flagHelp` per-flag override.
- **List limits are bounded.** `messagesListInput.limit` advertises the service
  clamp (1-200, default 50) instead of an unbounded positive int, and
  `inboundMessagesListInput.limit` now enforces the 1-100 bounds its description
  already claimed. Out-of-range values fail at the schema instead of being
  silently clamped server-side.
