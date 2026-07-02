---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Align the `blocked` message status with what the API actually returns.

The message read endpoints (`messages.list` / `messages.get`), the live tail,
and the logs view no longer return a per-message `blockedReason`; a blocked
message carries only its generic `blocked` status, with any human-readable note
recorded on the message `timeline`. The SDK is updated to match:

- **Removed `Message.blockedReason`.** The field was never populated by these
  endpoints anymore, so reading it always yielded `undefined`. Consumers should
  branch on `status === "blocked"` instead. `blocked` remains a valid
  `MESSAGE_STATUSES` value and a valid `senderkit_messages_list.status` filter —
  only the extra field is gone.
- Reworded the `Message.status` and `MESSAGE_STATUSES` docs (SDK types + MCP
  tool schema) to describe a `blocked` message generically, without implying a
  detailed per-message reason field.
