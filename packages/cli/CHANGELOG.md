# @senderkit/cli

## 0.3.0

### Minor Changes

- 78f4d81: Add web-push channel support

  Web push (browser notifications) is now a first-class channel alongside email, sms, and push.
  - SDK: `Channel` includes `"web-push"`; new `RawWebPushContent` and `SendRawWebPushRequest` types. `sendRaw({ channel: "web-push", to, content })` where `to` is the JSON-encoded browser `PushSubscription` and `content` carries `title`, `body`, and optional `icon`/`clickUrl`/`data`/`badge`.
  - MCP schemas: `channel` enum accepts `web-push`; `send_raw` gains `icon` and `clickUrl` inputs.
  - CLI: `senderkit send-raw <subscription> --channel web-push --title … --body … [--icon …] [--click-url …]`.

### Patch Changes

- Updated dependencies [78f4d81]
  - @senderkit/sdk@0.3.0

## 0.2.1

### Patch Changes

- 190deb0: Fix CLI `--cc`, `--bcc`, and `--attachments` flags throwing a Zod validation error

  The shared MCP/CLI input shapes typed `cc`/`bcc` as `string[]` and `attachments` as an object array with no string coercion, so the commander-supplied string values failed validation even though the flags were advertised in `--help`. They now accept a comma-separated or JSON-array string (`cc`/`bcc`) or a JSON-array string (`attachments`) from the CLI while real arrays/objects from the MCP server still pass through unchanged, mirroring how `vars`/`metadata` already work.

  Also bump the SDK runtime `VERSION` constant to `0.2.0` so the `User-Agent` header matches the published package version, with a test guarding against future drift.

- Updated dependencies [190deb0]
  - @senderkit/sdk@0.2.1

## 0.2.0

### Minor Changes

- d535d41: Initial public release.

### Patch Changes

- Updated dependencies [d535d41]
  - @senderkit/sdk@0.2.0
