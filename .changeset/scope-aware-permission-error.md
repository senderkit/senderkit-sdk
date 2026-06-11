---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Surface `403 insufficient_scope` as a distinct, scope-aware error.

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
