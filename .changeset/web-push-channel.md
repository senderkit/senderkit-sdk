---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add web-push channel support

Web push (browser notifications) is now a first-class channel alongside email, sms, and push.

- SDK: `Channel` includes `"web-push"`; new `RawWebPushContent` and `SendRawWebPushRequest` types. `sendRaw({ channel: "web-push", to, content })` where `to` is the JSON-encoded browser `PushSubscription` and `content` carries `title`, `body`, and optional `icon`/`clickUrl`/`data`/`badge`.
- MCP schemas: `channel` enum accepts `web-push`; `send_raw` gains `icon` and `clickUrl` inputs.
- CLI: `senderkit send-raw <subscription> --channel web-push --title … --body … [--icon …] [--click-url …]`.
