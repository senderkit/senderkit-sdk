// Single source of truth: the version is read from package.json and inlined at
// build time by tsup/esbuild, so the runtime VERSION (the `--version` output
// and MCP server identity) can never drift from the published version.
import { version } from "../package.json";

export const VERSION: string = version;
