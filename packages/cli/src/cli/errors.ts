import {
  SenderKitApiError,
  SenderKitAuthenticationError,
  SenderKitError,
  SenderKitRateLimitError,
  SenderKitTimeoutError,
  SenderKitValidationError,
} from "@senderkit/sdk";
import { ZodError } from "zod";
import pc from "picocolors";
import { MissingApiKeyError } from "../core/context.js";

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

/** Print an error and exit non-zero. */
export function handleError(err: unknown): never {
  process.stderr.write(`${pc.red("✗")} ${describeError(err)}\n`);
  process.exit(1);
}
