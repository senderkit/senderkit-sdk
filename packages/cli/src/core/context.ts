import { SenderKit } from "@senderkit/sdk";
import { readConfig } from "./config";

export interface ResolveOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "No SenderKit API key found. Provide one via --api-key, the SENDERKIT_API_KEY " +
        "environment variable, or `senderkit config set apiKey <key>` " +
        "(or run `senderkit login`).",
    );
    this.name = "MissingApiKeyError";
  }
}

/** Resolve the API key (flag → env → config file), or undefined if none. */
export function tryResolveApiKey(options: ResolveOptions = {}): string | undefined {
  return (
    options.apiKey ?? process.env["SENDERKIT_API_KEY"] ?? readConfig().apiKey
  );
}

/** Resolve the API key: flag → env → config file. Throws if none found. */
export function resolveApiKey(options: ResolveOptions = {}): string {
  const key = tryResolveApiKey(options);
  if (!key) throw new MissingApiKeyError();
  return key;
}

/** Resolve the base URL: flag → env → config file (undefined uses SDK default). */
export function resolveBaseUrl(options: ResolveOptions = {}): string | undefined {
  return (
    options.baseUrl ??
    process.env["SENDERKIT_BASE_URL"] ??
    readConfig().baseUrl ??
    undefined
  );
}

export function buildClient(options: ResolveOptions = {}): SenderKit {
  const apiKey = resolveApiKey(options);
  const baseUrl = resolveBaseUrl(options);
  return new SenderKit(baseUrl ? { apiKey, baseUrl } : { apiKey });
}
