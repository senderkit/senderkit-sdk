#!/usr/bin/env node
/**
 * Regenerate each package's `src/version.ts` from its `package.json` so the
 * runtime `VERSION` constant (sent as the `User-Agent` header) can never drift
 * from the published version.
 *
 * Run automatically by the root `version` script after `changeset version`
 * bumps the manifests, so the "Version Packages" PR includes the synced files.
 * Idempotent: only rewrites a file when its contents change.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packages = ["sdk", "cli", "react-email"];

let changed = 0;
for (const name of packages) {
  const versionFile = join(root, "packages", name, "src", "version.ts");
  if (!existsSync(versionFile)) continue;

  const pkgPath = join(root, "packages", name, "package.json");
  const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
  const next = `export const VERSION = ${JSON.stringify(version)};\n`;

  if (readFileSync(versionFile, "utf8") !== next) {
    writeFileSync(versionFile, next);
    changed++;
    console.log(`synced packages/${name}/src/version.ts -> ${version}`);
  }
}

if (changed === 0) console.log("version.ts already in sync");
