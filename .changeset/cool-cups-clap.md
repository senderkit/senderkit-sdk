---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Drop the `Message.blockedReason` field. senderkit-app (#211) confirmed the
abuse scanner's detailed block reason is operator-only and is never returned
by the public messages API — customer-facing reads omit the column entirely
and a `blocked` message exposes only a generic `blocked` entry on its
`timeline`. The previously-added `blockedReason` field would therefore never
be populated, so it has been removed and the `Message.status` /
`MESSAGE_STATUSES` docs updated to match. The `blocked` status itself is
unchanged.
