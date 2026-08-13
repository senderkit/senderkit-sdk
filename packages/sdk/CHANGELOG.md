# @senderkit/sdk

## 0.15.0

### Minor Changes

- 771b466: Complete the MCP safety-hint trio on every manifest tool. `ToolAnnotations` is now an interface requiring explicit `readOnlyHint`, `openWorldHint`, and `destructiveHint` values — OpenAI's ChatGPT/Codex plugin review rejects tools that omit any of the three — and every `MCP_TOOLS` entry carries the completed trio. The send tools (`senderkit_send`, `senderkit_send_raw`) are the only `openWorldHint: true` tools, since they deliver messages to recipients outside SenderKit; read-only tools explicitly declare `openWorldHint: false, destructiveHint: false`. The CLI-bundled MCP server surfaces the completed trio over `tools/list` with no other behavior change.

  For type consumers this widens the previous one-hint union: code that constructed a partial `ToolAnnotations` (e.g. `{ readOnlyHint: true }`) must now state all three hints.

### Patch Changes

- f73f1e9: Make the inbound `verdicts` field documentation provider-neutral: it now describes the map as "scanning verdicts (e.g. spam/virus/SPF/DKIM), as reported" without naming the underlying receiving infrastructure. The shipped type and its runtime shape are unchanged.
- dc37adf: Sharpen the send-tool schema guidance to match the hosted API's validation, so MCP agents and CLI users get the constraint before they hit a `400`:

  - `scheduledAt` now documents that the timestamp must be in the future and at most 30 days ahead (with a reminder to check the current date first). This flows through both `senderkit_send` and `senderkit_send_raw`, their CLI help, and the SDK README's scheduling section.
  - `senderkit_send_raw` `subject` and `html` now state that they are required when the channel is `email` — a text-only email send is rejected, so plain text should be wrapped in minimal HTML.

## 0.14.2

### Patch Changes

- 702dba8: Document that SMS recipients must be an E.164 phone number, matching the hosted API's validation. The API now rejects a non-E.164 SMS `to` with `400 invalid_recipient` (for both template and raw sends) instead of accepting it and failing later at dispatch.

  - The `senderkit_send_raw` `to` field description now spells out the per-channel recipient formats — including the E.164 requirement for `sms` — bringing it in line with `senderkit_send`, which already documented it. This flows through to the `senderkit send-raw` CLI help.
  - The SDK README's SMS example now notes the E.164 requirement and the `400 invalid_recipient` response.

## 0.14.1

### Patch Changes

- dc8ad1e: Align the MCP manifest's inbound tool definitions with the hosted app's corrected versions (the same adoption pattern as the earlier cc/bcc/limit wording fix):

  - `senderkit_inbound_addresses_create` is now annotated `destructiveHint: false` — creating an address is additive and fully reversed by deleting it, so clients need not demand confirmation.
  - The `livemode` field description no longer claims test-mode addresses "don't count against quota"; every address, test or live, counts toward the plan's inbound-address limit.
  - `senderkit_inbound_messages_list` / `senderkit_inbound_messages_get` are titled "List Inbound Messages" / "Get Inbound Message", and the remaining inbound tool descriptions and field descriptions now match the app's served wording — including a friendlier ISO 8601 validation message on the `before` cursor.
  - Three `inbound_addresses_create` field docs were corrected against the actual implementation, in lockstep with the app: `localPart` documents the `"*"` catch-all and the charset rules, `webhookEndpointId` documents the unbound fan-out to subscribed endpoints, and `livemode` notes that a test-mode address's forwards are recorded as test sends without real delivery.

## 0.14.0

### Minor Changes

- ca9d5ec: MCP manifest fixes from the 2026-07-31 connectors-directory audit — the shared
  manifest now states the real wire contract, so the hosted server no longer needs
  app-side overrides for these:

  - **`ToolAnnotations` widened to admit non-destructive writes.** The union was
    `readOnlyHint: true` XOR `destructiveHint: true`, but MCP also has additive,
    non-destructive writes (`destructiveHint: false`) — e.g. the app's
    `templates_create` / `inbound_addresses_create`. `destructiveHint` now accepts
    either boolean (still exactly one hint per tool).
  - **cc/bcc descriptions no longer leak CLI input conventions.** On the MCP wire
    these fields are plain JSON arrays; "(CLI: comma-separated or JSON array)" is
    gone from the manifest, and the schema now also enforces the API's 50-recipient
    cap (`maxItems: 50`). The CLI keeps documenting comma-separated input in its
    own flag help via the new `Command.flagHelp` per-flag override.
  - **List limits are bounded.** `messagesListInput.limit` advertises the service
    clamp (1-200, default 50) instead of an unbounded positive int, and
    `inboundMessagesListInput.limit` now enforces the 1-100 bounds its description
    already claimed. Out-of-range values fail at the schema instead of being
    silently clamped server-side.

## 0.13.0

### Minor Changes

- c1caf54: Add inbound email — receive mail, not just send it.

  A new `inbound` namespace covers three things: **addresses** to receive on,
  **messages** that arrive on them, and **domains** to receive under. Requires an
  API key with the `inbound` scope.

  Addresses live on the workspace's shared `{slug}.in.senderkit.email` domain,
  which is created lazily on first use. Pass a `localPart` to pick one, omit it for
  an unguessable generated address, or pass `"*"` for a catch-all that takes every
  local part no exact address claims — an exact address always wins.

  Received mail is retained for **30 days**; fetching the raw source or an
  attachment after that rejects with a `SenderKitApiError` (`410`).
  - **SDK:** `client.inbound.addresses` (`list`, `create`, `delete`),
    `client.inbound.messages` (`list`, `get`, `raw`, `attachment`), and
    `client.inbound.domains` (`list`, `create`, `delete`). `messages.get` returns
    the parsed body, headers, attachment metadata and SPF/DKIM/DMARC verdicts;
    `raw` returns `message/rfc822` bytes and `attachment(id, index)` returns one
    attachment by its zero-based `index`. Types are exported from the package root
    — `InboundAddress`, `InboundDomain`, `InboundMessage`,
    `InboundMessageSummary`, `InboundAttachment`, `InboundDnsRecord`,
    `InboundMessageStatus`, and the matching param/response types.
  - **CLI:** eight new commands — `senderkit inbound addresses list|create|delete`,
    `senderkit inbound messages list|get`, and
    `senderkit inbound domains list|create|delete`.
  - **MCP:** eight new tools mirroring those commands, named
    `senderkit_inbound_{addresses,messages,domains}_*`.

  Claiming a custom domain returns the DNS `records` to publish; nothing is
  received until they are live and the domain flips to `verified`. If the domain
  already has MX records pointing elsewhere, `domains.create` rejects with a
  `SenderKitApiError` (`409`, `code: "existing_mx"`) naming the current mail hosts
  — confirm with the user, then retry with `acknowledgeExistingMx: true`. The
  shared domain cannot be deleted.

- 1bc020e: Surface provider-reported open/click engagement on messages.
  - **`openedAt`** — first provider-reported email open, as an ISO 8601 string, or
    `null` until opened. Set once on the first open; later opens don't update it.
  - **`clickedAt`** — first provider-reported link click, as an ISO 8601 string, or
    `null` until a link is clicked. Set once on the first click; later clicks don't
    update it.

  Both fields are returned by `messages.get` and `messages.list`.
  - **SDK:** `openedAt` / `clickedAt` added to the `Message` type.
  - **CLI:** `senderkit messages get` now prints `openedAt` / `clickedAt`.
  - **Webhooks:** two new subscribable event types — `message.opened` and
    `message.clicked`. They're engagement signals and never change a message's
    status (`delivered` stays terminal). The `message.clicked` payload additionally
    carries the clicked `link`.

- d8560bb: Add the `suppressed` message lifecycle status.

  The API can now return `suppressed` for a message: the provider accepted the
  send but never attempted delivery — the recipient address failed validation, or
  was already suppressed for this sender. It is distinct from `failed`, which is a
  bounce reported by the receiving mail server.
  - **SDK:** `suppressed` added to the exported `MESSAGE_STATUSES` list (between
    `opted_out` and `blocked`), and documented on `Message.status`.
  - **MCP:** the `senderkit_messages_list` `status` filter now accepts
    `suppressed`.

## 0.12.0

### Minor Changes

- 9a0b124: Add per-send From overrides on email sends, identical on templated and raw sends.
  - **`from`** — optional From **address** override (bare address). Previously
    available on `sendRaw` only; now also accepted on `send` (templated).
  - **`fromName`** — new on both `send` and `sendRaw`: optional From **display
    name** override, rendered by the sender as `Name <address>`. Max 128
    characters; no control characters or angle brackets.

  Either field can be set on its own; both fall back to the provider connection's
  configured values. On managed sending the `from` address is honored only on the
  workspace's verified sending domain, while `fromName` always applies.
  - **SDK:** `from` / `fromName` added to `SendRequest` and `fromName` to
    `SendRawEmailRequest`; both forwarded to `/v1/send`.
  - **MCP:** `senderkit_send` and `senderkit_send_raw` gain `from` / `fromName`
    inputs.
  - **CLI:** `senderkit send` and `senderkit send-raw` gain `--from` / `--from-name`.

## 0.11.0

### Minor Changes

- 06e85f7: Align the `blocked` message status with what the API actually returns.

  The message read endpoints (`messages.list` / `messages.get`), the live tail,
  and the logs view no longer return a per-message `blockedReason`; a blocked
  message carries only its generic `blocked` status, with any human-readable note
  recorded on the message `timeline`. The SDK is updated to match:
  - **Removed `Message.blockedReason`.** The field was never populated by these
    endpoints anymore, so reading it always yielded `undefined`. Consumers should
    branch on `status === "blocked"` instead. `blocked` remains a valid
    `MESSAGE_STATUSES` value and a valid `senderkit_messages_list.status` filter —
    only the extra field is gone.
  - Reworded the `Message.status` and `MESSAGE_STATUSES` docs (SDK types + MCP
    tool schema) to describe a `blocked` message generically, without implying a
    detailed per-message reason field.

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
