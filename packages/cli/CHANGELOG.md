# @senderkit/cli

## 0.9.1

### Patch Changes

- Updated dependencies [dc8ad1e]
  - @senderkit/sdk@0.14.1

## 0.9.0

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

### Patch Changes

- Updated dependencies [ca9d5ec]
  - @senderkit/sdk@0.14.0

## 0.8.0

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

### Patch Changes

- Updated dependencies [c1caf54]
- Updated dependencies [1bc020e]
- Updated dependencies [d8560bb]
  - @senderkit/sdk@0.13.0

## 0.7.0

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

### Patch Changes

- Updated dependencies [9a0b124]
  - @senderkit/sdk@0.12.0

## 0.6.4

### Patch Changes

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

- Updated dependencies [06e85f7]
  - @senderkit/sdk@0.11.0

## 0.6.3

### Patch Changes

- 505e36c: Resolve `pnpm audit` advisories by bumping vulnerable transitive dependencies.
  - **`hono`** → `>=4.12.25` (pnpm override). Pulled in at runtime via
    `@modelcontextprotocol/sdk`; clears 5 advisories (GHSA-wwfh-h76j-fc44,
    GHSA-j6c9-x7qj-28xf, GHSA-rv63-4mwf-qqc2, GHSA-wgpf-jwqj-8h8p,
    GHSA-88fw-hqm2-52qc).
  - **`js-yaml`** → `>=4.2.0` (pnpm override). Dev-only, via `@changesets/cli`
    (GHSA-h67p-54hq-rp68).
  - **`vite`** → `^8.0.16`, pinned as a direct devDependency in the three
    test packages. Dev-only, via `vitest` (GHSA-fx2h-pf6j-xcff,
    GHSA-v6wh-96g9-6wx3). An override alone doesn't move it because `vite` is
    both a dependency and a peerDependency of `vitest`, so the version is pinned
    where the peer is consumed instead.

  `pnpm audit --audit-level=moderate` now reports no known vulnerabilities.

- 1fe3c66: Add the `blocked` message status, keeping the CLI/MCP surface in
  lockstep with the app's `messageStatusEnum`. A `blocked` message was halted
  by automated content safety checks.
  - **`MESSAGE_STATUSES`** now includes `blocked` (between `opted_out` and
    `canceled`), mirroring the app enum. The `senderkit_messages_list.status`
    MCP/CLI filter is a strict `z.enum(MESSAGE_STATUSES)`, so before this change
    it rejected `status: "blocked"` as invalid input — callers can now filter for
    blocked messages.

- Updated dependencies [1fe3c66]
  - @senderkit/sdk@0.10.0

## 0.6.2

### Patch Changes

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

- Updated dependencies [77d838e]
  - @senderkit/sdk@0.9.0

## 0.6.1

### Patch Changes

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

- Updated dependencies [8766161]
  - @senderkit/sdk@0.8.0

## 0.6.0

### Minor Changes

- dc3478d: `senderkit mcp install` now defaults to the **hosted** MCP endpoint
  (`https://mcp.senderkit.com`) over **OAuth**, matching the configs shipped by the
  `senderkit-skills` plugin. A `url`-only entry is written with no credential on
  disk; the client drives sign-in (Claude Code `/mcp`, Cursor → Settings → MCP,
  `codex mcp login senderkit`).

  **Behavior change:** previously the default wrote a local stdio server
  (`senderkit mcp` subprocess + `SENDERKIT_API_KEY`). To keep that, pass the new
  `--local` flag.
  - `--local` opts into the local stdio subprocess.
  - `--api-key-auth` opts into bearer-token auth for the hosted endpoint
    (`Authorization: Bearer …`, or `bearer_token_env_var` for Codex) instead of OAuth.
  - `--remote` is still accepted (now the default) for back-compat; `--url` sets a
    custom endpoint.
  - **Codex** remote installs now write a native streamable-HTTP `url` entry
    instead of routing through the `mcp-remote` stdio bridge — Codex's native
    remote MCP support is stable and OAuth-capable.
  - API: `oauthRemoteSpec()` and `apiKeyRemoteSpec()` replace the single
    `remoteSpec()` (kept as a back-compat alias for the API-key form); added
    `isApiKeyAuth()` and the `RemoteSpec.bearerEnvVar` field.

## 0.5.1

### Patch Changes

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

- Updated dependencies [121e8ca]
  - @senderkit/sdk@0.7.0

## 0.5.0

### Minor Changes

- 4a461a8: Add `client.context()` (and the `SenderKitContext` type): fetches the connected
  workspace `{ id, slug, name }` and send mode from `GET /v1/context`. The
  `senderkit context` CLI command now reports the workspace name + slug instead of
  just the mode, and the `senderkit_context` tool description mentions the
  workspace.

### Patch Changes

- Updated dependencies [4a461a8]
  - @senderkit/sdk@0.6.0

## 0.4.1

### Patch Changes

- fa850e7: Add `@senderkit/sdk/mcp`: a canonical MCP tool manifest (name, title, base
  description, annotations, input schema) shared by the CLI and the app-hosted
  server. CLI commands now derive their tool metadata from it, so tool
  names/titles/descriptions/annotations no longer drift between surfaces.

  `@senderkit/sdk/mcp` is now the single MCP entry point — it re-exports the input
  shapes and `SEND_TOOL_LIVE_MODE_NOTE`. **Breaking:** the `@senderkit/sdk/mcp-schemas`
  subpath has been removed; import those from `@senderkit/sdk/mcp` instead.

- Updated dependencies [fa850e7]
  - @senderkit/sdk@0.5.0

## 0.4.0

### Minor Changes

- 24de96c: Surface live/test mode through the MCP tool surface, matching the app-hosted server.
  - New `senderkit_context` tool / `senderkit context` command reports the active connection's `mode` (`live`/`test`) and `livemode`, so an LLM can confirm whether sends are really delivered before calling a send tool.
  - `senderkit_send` / `senderkit_send_raw` MCP results now include a `mode` field alongside `livemode`.
  - `SEND_TOOL_LIVE_MODE_NOTE` now points the model at `senderkit_context`; a new `contextInput` schema is exported from `@senderkit/sdk/mcp-schemas`.

- 31d2689: Add MCP tool annotations required by the Anthropic Claude Connectors Directory.
  - Every MCP tool now declares a human-readable `title` and exactly one behaviour hint (`readOnlyHint` or `destructiveHint`), surfaced through `tools/list` on both the CLI-bundled stdio server and the app-hosted HTTP server.
  - `Command` gains `title` and a `ToolAnnotations` union typed so a tool is declared as either read-only or destructive — never both, never neither (enforced at compile time).
  - Read-only: `senderkit_context`, `senderkit_messages_list`, `senderkit_messages_get`, `senderkit_templates_list`, `senderkit_templates_get`. Destructive: `senderkit_send`, `senderkit_send_raw`, `senderkit_cancel_message`.

### Patch Changes

- Updated dependencies [24de96c]
  - @senderkit/sdk@0.4.0

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

- Updated dependencies [6f0ca2b]
  - @senderkit/sdk@0.3.1

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
