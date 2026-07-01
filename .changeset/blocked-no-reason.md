---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Correct the `blocked` message docs: the API does not return a block reason.

The message read endpoints (`messages.list` / `messages.get`) never include a
reason field for a `blocked` message — a block surfaces only as the `blocked`
status plus a generic `blocked` entry on the message timeline. This removes the
misdocumented `Message.blockedReason` field from the type and updates the
MCP/CLI status descriptions to match. The `blocked` status itself is unchanged
and remains a valid `messages.list` filter value.
