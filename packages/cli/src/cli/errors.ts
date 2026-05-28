import {
  SenderKitApiError,
  SenderKitAuthenticationError,
  SenderKitError,
  SenderKitNetworkError,
  SenderKitRateLimitError,
  SenderKitTimeoutError,
  SenderKitValidationError,
} from "@senderkit/sdk";
import { ZodError } from "zod";
import pc from "picocolors";
import { MissingApiKeyError } from "../core/context";

export type CliErrorType =
  | "validation"
  | "missing_api_key"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "network"
  | "api"
  | "unknown";

export interface CliErrorPayload {
  type: CliErrorType;
  message: string;
  status?: number;
  retryAfter?: number;
  issues?: unknown;
  requestId?: string;
}

let jsonMode = false;

/** Toggle JSON-formatted error output. Mirrors the `--json` global flag. */
export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

/** Convert any thrown error into a user-facing message. */
export function describeError(err: unknown): string {
  if (err instanceof ZodError) {
    const issues = err.issues
      .map((i) => `  • ${i.path.join(".") || "(input)"}: ${i.message}`)
      .join("\n");
    return `Invalid input:\n${issues}`;
  }
  if (err instanceof MissingApiKeyError) return err.message;
  if (err instanceof SenderKitAuthenticationError) {
    return "Authentication failed. Check your API key (--api-key, SENDERKIT_API_KEY, or config).";
  }
  if (err instanceof SenderKitValidationError) {
    const detail = err.issues ? `\n${JSON.stringify(err.issues, null, 2)}` : "";
    return `Request rejected: ${err.message}${detail}`;
  }
  if (err instanceof SenderKitRateLimitError) {
    const after = err.retryAfter ? ` Retry after ${err.retryAfter}ms.` : "";
    return `Rate limited.${after}`;
  }
  if (err instanceof SenderKitTimeoutError) return "Request timed out.";
  if (err instanceof SenderKitApiError) {
    return `API error (${err.status}): ${err.message}`;
  }
  if (err instanceof SenderKitError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Build a machine-readable error payload for `--json` mode. */
export function describeErrorAsObject(err: unknown): CliErrorPayload {
  if (err instanceof ZodError) {
    return { type: "validation", message: "Invalid input", issues: err.issues };
  }
  if (err instanceof MissingApiKeyError) {
    return { type: "missing_api_key", message: err.message };
  }
  if (err instanceof SenderKitAuthenticationError) {
    return {
      type: "authentication",
      message:
        "Authentication failed. Check your API key (--api-key, SENDERKIT_API_KEY, or config).",
      status: err.status,
      requestId: err.requestId,
    };
  }
  if (err instanceof SenderKitValidationError) {
    return {
      type: "validation",
      message: err.message,
      status: err.status,
      issues: err.issues,
      requestId: err.requestId,
    };
  }
  if (err instanceof SenderKitRateLimitError) {
    return {
      type: "rate_limit",
      message: "Rate limited.",
      status: err.status,
      retryAfter: err.retryAfter,
      requestId: err.requestId,
    };
  }
  if (err instanceof SenderKitTimeoutError) {
    return { type: "timeout", message: "Request timed out." };
  }
  if (err instanceof SenderKitNetworkError) {
    return { type: "network", message: err.message };
  }
  if (err instanceof SenderKitApiError) {
    return {
      type: "api",
      message: err.message,
      status: err.status,
      requestId: err.requestId,
    };
  }
  if (err instanceof Error) {
    return { type: "unknown", message: err.message };
  }
  return { type: "unknown", message: String(err) };
}

/** Print an error and exit non-zero. */
export function handleError(err: unknown): never {
  if (jsonMode) {
    process.stderr.write(`${JSON.stringify({ error: describeErrorAsObject(err) })}\n`);
  } else {
    process.stderr.write(`${pc.red("✗")} ${describeError(err)}\n`);
  }
  process.exit(1);
}
