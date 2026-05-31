// Single source of truth: the version is read from package.json and inlined at
// build time by tsup/esbuild, so the runtime VERSION (sent as the User-Agent
// header) can never drift from the published version.
import { version } from "../package.json";

export const VERSION: string = version;
