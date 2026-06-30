---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Drop `Message.blockedReason` from the message type and reword the `blocked`
status docs.

The hosted API does not return a per-message block reason on customer-facing
reads (`messages.list`, `messages.get`, and the live tail) — a `blocked`
message exposes only its `blocked` status and a generic block entry on the
timeline. The previously documented `Message.blockedReason` field was never
populated by these endpoints, so it has been removed to match the API.

- **`Message.blockedReason`** is removed from the `Message` type. The `blocked`
  status itself is unchanged and still part of `MESSAGE_STATUSES`; only the
  reason field and its doc references are dropped.
- **Doc wording** for the `blocked` status (type docs + the MCP/CLI
  `MESSAGE_STATUSES` description) now describes it neutrally as a send halted by
  automated content-safety checks before delivery.
