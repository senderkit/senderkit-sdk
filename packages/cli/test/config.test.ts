import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  configPath,
  maskKey,
  readConfig,
  setConfigValue,
  writeConfig,
} from "../src/core/config";

let originalHome: string | undefined;

beforeEach(() => {
  originalHome = process.env["HOME"];
  process.env["HOME"] = mkdtempSync(join(tmpdir(), "sk-cfg-"));
});

afterEach(() => {
  process.env["HOME"] = originalHome;
});

describe("config", () => {
  it("round-trips values", () => {
    setConfigValue("apiKey", "sk_test_abc");
    setConfigValue("baseUrl", "http://localhost:1");
    expect(readConfig()).toEqual({ apiKey: "sk_test_abc", baseUrl: "http://localhost:1" });
  });

  it("returns empty config when no file exists", () => {
    expect(readConfig()).toEqual({});
  });

  it("writes the file with 0600 permissions", () => {
    writeConfig({ apiKey: "sk_test_abc" });
    const mode = statSync(configPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("masks API keys", () => {
    expect(maskKey("sk_test_1234567890abcd")).toMatch(/^sk_test_123…abcd$/);
    expect(maskKey("short")).toBe("****");
  });
});
