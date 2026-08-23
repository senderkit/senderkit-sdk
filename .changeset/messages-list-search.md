---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add a `search` filter to `messages.list`

`messages.list` now accepts a `search` parameter — a case-insensitive
substring match over a message's public id, recipient, template slug, and
metadata keys/values. It composes with the existing filters and cursor
pagination; use the `metadata` filter when you need an exact match. Terms are
capped at 512 characters.

The same filter is exposed on the `messages list` CLI command (`--search`) and
the `senderkit_messages_list` MCP tool.
