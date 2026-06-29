---
"@senderkit/sdk": patch
---

Drop the `Message.blockedReason` field from the message type.

The API never returns a per-message reason on `messages.list` / `messages.get`
— reads expose only the lifecycle `status` (including the terminal `blocked`
state) and the message timeline. The previously documented optional
`blockedReason` field was therefore never populated, so advertising it on the
public `Message` type and in the MCP status description was misleading.

- **`Message.blockedReason`** removed from the type. The message object's index
  signature (`[key: string]: unknown`) is unchanged, so this is not a runtime
  change — the field was simply never present.
- Tightened the `Message.status` and `MESSAGE_STATUSES` doc comments to describe
  `blocked` as a terminal state without implying a reason field is returned.

The `blocked` value in `MESSAGE_STATUSES` and the
`senderkit_messages_list.status` filter are unaffected — you can still filter
for blocked messages.
