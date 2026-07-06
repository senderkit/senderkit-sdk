# @senderkit/sdk

## 0.10.0

### Minor Changes

- 1fe3c66: Add the `blocked` message status, bringing the SDK, CLI, and MCP
  surface back in lockstep with the app's `messageStatusEnum`. A `blocked`
  message was halted by automated content safety checks.
  - **`MESSAGE_STATUSES`** now includes `blocked` (between `opted_out` and
    `canceled`), mirroring the app enum. The `senderkit_messages_list.status`
    MCP/CLI filter is a strict `z.enum(MESSAGE_STATUSES)`, so before this change
    it rejected `status: "blocked"` as invalid input — callers can now filter for
    blocked messages.

## 0.9.0

### Minor Changes

- 77d838e: Sync the MCP tool manifest with the richer metadata the hosted server (senderkit-app) now serves.

  The hosted MCP server had diverged from the shared `@senderkit/sdk` manifest by
  overriding tool descriptions and tightening two input fields at the app layer.
  This brings the canonical manifest — used by the CLI-bundled stdio/HTTP MCP
  server and the CLI's `--help` — back in lockstep.
  - **Tool descriptions** (`senderkit_send`, `senderkit_send_raw`,
    `senderkit_templates_list`, `senderkit_templates_get`,
    `senderkit_messages_list`, `senderkit_messages_get`) now lead with the
    email/SMS/push/web-push channel keywords and describe the use case. The
    send-tool descriptions remain the base wording; each server still appends its
    own live/test mode note.
  - **`senderkit_messages_list.status`** is now a strict enum
    (`scheduled, queued, rendered, dispatched, sent, delivered, failed,
opted_out, canceled`) instead of free-form text, matching the API, which
    already rejects unknown statuses with a 400. Exported as `MESSAGE_STATUSES`.
  - **`senderkit_send.to`** description now covers all four channels (email /
    E.164 phone / push device token / web-push PushSubscription).
  - **Template slug** field descriptions (`senderkit_send.template`,
    `senderkit_templates_get.slug`) note that slugs are lowercase — the app now
    canonicalizes slugs to lowercase on create/rename, so by-slug lookups should
    use the lowercase form.

## 0.8.0

### Minor Changes

- 8766161: Surface `403 insufficient_scope` as a distinct, scope-aware error.

  senderkit-app now enforces least-privilege API-key / MCP scopes (`read`,
  `send`, `cancel`) and returns `403` with `code: "insufficient_scope"` when a
  scoped credential is used outside its grant. Keys minted without explicit
  scopes stay unscoped and full-access, so existing integrations are unaffected.
  - **SDK:** new `SenderKitPermissionError` (extends `SenderKitApiError`) is now
    thrown for `403`; `401` continues to map to `SenderKitAuthenticationError`.
    Previously `403` was mapped to `SenderKitAuthenticationError`, which wrongly
    implied a bad key. Exported the `ApiScope` type (`"read" | "send" | "cancel"`)
    and documented the scope model.
  - **CLI:** a `403` now reports "Permission denied … lacks the required scope"
    (JSON `type: "permission"`) instead of the misleading "Authentication failed.
    Check your API key" message.

## 0.7.0

### Minor Changes

- 121e8ca: Align read types with the leaner server contract: `GET /v1/messages`,
  `GET /v1/messages/:id`, and `GET /v1/templates/:slug` no longer return the heavy
  rendered `content` blob (it could overflow the LLM/MCP context window).
  - **Breaking (types):** `TemplateVersion.content` has been removed — `templates.get`
    now returns only `versionNumber`, `variables`, and `publishedAt` under
    `currentVersion`.
  - Documented on the `Message` type that reads omit `content` while keeping
    `vars`, `timeline`, and `metadata`.

  No runtime/behavior change in the SDK or CLI (the CLI `templates get` output
  already surfaced only the version number).

## 0.6.0

### Minor Changes

- 4a461a8: Add `client.context()` (and the `SenderKitContext` type): fetches the connected
  workspace `{ id, slug, name }` and send mode from `GET /v1/context`. The
  `senderkit context` CLI command now reports the workspace name + slug instead of
  just the mode, and the `senderkit_context` tool description mentions the
  workspace.

## 0.5.0

### Minor Changes

- fa850e7: Add `@senderkit/sdk/mcp`: a canonical MCP tool manifest (name, title, base
  description, annotations, input schema) shared by the CLI and the app-hosted
  server. CLI commands now derive their tool metadata from it, so tool
  names/titles/descriptions/annotations no longer drift between surfaces.

  `@senderkit/sdk/mcp` is now the single MCP entry point — it re-exports the input
  shapes and `SEND_TOOL_LIVE_MODE_NOTE`. **Breaking:** the `@senderkit/sdk/mcp-schemas`
  subpath has been removed; import those from `@senderkit/sdk/mcp` instead.

## 0.4.0

### Minor Changes

- 24de96c: Surface live/test mode through the MCP tool surface, matching the app-hosted server.
  - New `senderkit_context` tool / `senderkit context` command reports the active connection's `mode` (`live`/`test`) and `livemode`, so an LLM can confirm whether sends are really delivered before calling a send tool.
  - `senderkit_send` / `senderkit_send_raw` MCP results now include a `mode` field alongside `livemode`.
  - `SEND_TOOL_LIVE_MODE_NOTE` now points the model at `senderkit_context`; a new `contextInput` schema is exported from `@senderkit/sdk/mcp-schemas`.

## 0.3.1

### Patch Changes

- 6f0ca2b: Point the default REST base URL at the dedicated `api.senderkit.com` host

  The SDK (and the CLI, which inherits the SDK default) now default `baseUrl` to
  `https://api.senderkit.com` instead of `https://senderkit.com/api`.

  SenderKit now serves the public REST API from a dedicated host that exposes the
  clean `/v1/*` surface, so `senderkit.send(...)` hits
  `https://api.senderkit.com/v1/send`. This matches the OpenAPI spec's canonical
  server and every published HTTP sample. The dedicated host also avoids the
  apex→www canonicalization redirect that strips the `Authorization` header on
  cross-host requests.

  The CLI's hosted MCP default is also corrected from
  `https://mcp.senderkit.com/mcp` to `https://mcp.senderkit.com`. On the new
  dedicated MCP host the subdomain root _is_ the endpoint — any other path
  (including `/mcp`) returns 404 — so the old default would have failed.

  No code changes are required for callers that pass an explicit `baseUrl` or
  `--url`.

## 0.3.0

### Minor Changes

- 78f4d81: Add web-push channel support

  Web push (browser notifications) is now a first-class channel alongside email, sms, and push.
  - SDK: `Channel` includes `"web-push"`; new `RawWebPushContent` and `SendRawWebPushRequest` types. `sendRaw({ channel: "web-push", to, content })` where `to` is the JSON-encoded browser `PushSubscription` and `content` carries `title`, `body`, and optional `icon`/`clickUrl`/`data`/`badge`.
  - MCP schemas: `channel` enum accepts `web-push`; `send_raw` gains `icon` and `clickUrl` inputs.
  - CLI: `senderkit send-raw <subscription> --channel web-push --title … --body … [--icon …] [--click-url …]`.

## 0.2.1

### Patch Changes

- 190deb0: Fix CLI `--cc`, `--bcc`, and `--attachments` flags throwing a Zod validation error

  The shared MCP/CLI input shapes typed `cc`/`bcc` as `string[]` and `attachments` as an object array with no string coercion, so the commander-supplied string values failed validation even though the flags were advertised in `--help`. They now accept a comma-separated or JSON-array string (`cc`/`bcc`) or a JSON-array string (`attachments`) from the CLI while real arrays/objects from the MCP server still pass through unchanged, mirroring how `vars`/`metadata` already work.

  Also bump the SDK runtime `VERSION` constant to `0.2.0` so the `User-Agent` header matches the published package version, with a test guarding against future drift.

## 0.2.0

### Minor Changes

- d535d41: Initial public release.
