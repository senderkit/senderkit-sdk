---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Surface live/test mode through the MCP tool surface, matching the app-hosted server.

- New `senderkit_context` tool / `senderkit context` command reports the active connection's `mode` (`live`/`test`) and `livemode`, so an LLM can confirm whether sends are really delivered before calling a send tool.
- `senderkit_send` / `senderkit_send_raw` MCP results now include a `mode` field alongside `livemode`.
- `SEND_TOOL_LIVE_MODE_NOTE` now points the model at `senderkit_context`; a new `contextInput` schema is exported from `@senderkit/sdk/mcp-schemas`.
