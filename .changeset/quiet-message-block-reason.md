---
"@senderkit/sdk": patch
---

Stop advertising `Message.blockedReason` on the message read type and in the
MCP status description. The customer-facing API (`messages.list` / `messages.get`,
plus the live tail) never returns the detailed abuse-scan trigger — it is
operator-only — so the optional field was always absent on the wire. A `blocked`
message still surfaces a generic "blocked" entry on its `timeline`. The `Message`
type keeps its `[key: string]: unknown` index signature, so this is non-breaking.
