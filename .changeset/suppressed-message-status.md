---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add the `suppressed` message lifecycle status.

The API can now return `suppressed` for a message: the provider accepted the
send but never attempted delivery — the recipient address failed validation, or
was already suppressed for this sender. It is distinct from `failed`, which is a
bounce reported by the receiving mail server.

- **SDK:** `suppressed` added to the exported `MESSAGE_STATUSES` list (between
  `opted_out` and `blocked`), and documented on `Message.status`.
- **MCP:** the `senderkit_messages_list` `status` filter now accepts
  `suppressed`.
