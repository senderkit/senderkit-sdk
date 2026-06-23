---
"@senderkit/sdk": patch
---

Correct the `blocked` message documentation. The detailed abuse-scan trigger is operator-only and is never returned on the public message read surface (`messages.list` / `messages.get`), so the previously-documented `Message.blockedReason` field (which the API never populated) has been removed. A blocked message is identified by its `blocked` status and a generic entry on its `timeline`. The `blocked` status itself is unchanged.
