---
"@senderkit/sdk": patch
---

Trim the `blocked` message documentation to match the public read API. The
`Message` reads (`messages.list` / `messages.get` and the MCP `senderkit_messages_list`
/ `senderkit_messages_get` tools) never return a per-message block reason, so the
optional `Message.blockedReason` field has been removed and the `blocked` status is
now described neutrally (delivery halted by a content/delivery policy check). `blocked`
remains a valid, filterable lifecycle status in `MESSAGE_STATUSES`.
