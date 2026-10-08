---
"@senderkit/cli": patch
---

Raise dependency floors past security advisories

- `@modelcontextprotocol/sdk` to `^1.31.0` (OAuth client could send
  credentials to the wrong authorization server).
- `smol-toml` to `^1.9.0` (quadratic-time `parse()`).
