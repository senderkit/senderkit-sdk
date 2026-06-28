---
"@senderkit/sdk": patch
---

Stop documenting a per-message block reason on the `Message` type.

The previous release advertised an optional `Message.blockedReason` field, but
the `messages.list` / `messages.get` endpoints never return it — a `blocked`
status simply means the send was halted by automated content-safety checks, with
no per-message reason exposed by the API. The phantom field is removed from the
type and the surrounding docs/MCP descriptions are corrected. The `blocked`
status itself is unchanged and remains a valid value and list filter.

`Message` keeps its `[key: string]: unknown` index signature, so this is a
documentation/typing correction rather than a runtime change.
