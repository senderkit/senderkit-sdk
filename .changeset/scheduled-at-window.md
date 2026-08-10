---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Sharpen the send-tool schema guidance to match the hosted API's validation, so MCP agents and CLI users get the constraint before they hit a `400`:

- `scheduledAt` now documents that the timestamp must be in the future and at most 30 days ahead (with a reminder to check the current date first). This flows through both `senderkit_send` and `senderkit_send_raw`, their CLI help, and the SDK README's scheduling section.
- `senderkit_send_raw` `subject` and `html` now state that they are required when the channel is `email` — a text-only email send is rejected, so plain text should be wrapped in minimal HTML.
