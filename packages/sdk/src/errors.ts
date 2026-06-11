export interface ApiErrorBody {
  code?: string;
  message?: string;
  issues?: unknown;
}

export class SenderKitError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "SenderKitError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitApiError extends SenderKitError {
  readonly status: number;
  readonly code: string | undefined;
  readonly issues: unknown;
  readonly requestId: string | undefined;

  constructor(args: {
    status: number;
    message: string;
    code?: string | undefined;
    issues?: unknown;
    requestId?: string | undefined;
  }) {
    super(args.message);
    this.name = "SenderKitApiError";
    this.status = args.status;
    this.code = args.code;
    this.issues = args.issues;
    this.requestId = args.requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitAuthenticationError extends SenderKitApiError {
  constructor(args: ConstructorParameters<typeof SenderKitApiError>[0]) {
    super(args);
    this.name = "SenderKitAuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 403 — the credential is valid but lacks the scope required for the
 * operation. The API returns `code: "insufficient_scope"`. Distinct from
 * {@link SenderKitAuthenticationError} (401), which means the key itself is
 * missing or invalid. Keys minted without explicit scopes are unscoped and
 * have full access, so this only fires for scope-restricted keys (or MCP OAuth
 * connections) used outside their granted scopes.
 */
export class SenderKitPermissionError extends SenderKitApiError {
  constructor(args: ConstructorParameters<typeof SenderKitApiError>[0]) {
    super(args);
    this.name = "SenderKitPermissionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitValidationError extends SenderKitApiError {
  constructor(args: ConstructorParameters<typeof SenderKitApiError>[0]) {
    super(args);
    this.name = "SenderKitValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitRateLimitError extends SenderKitApiError {
  readonly retryAfter: number | undefined;

  constructor(
    args: ConstructorParameters<typeof SenderKitApiError>[0] & { retryAfter?: number | undefined },
  ) {
    super(args);
    this.name = "SenderKitRateLimitError";
    this.retryAfter = args.retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitTimeoutError extends SenderKitError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "SenderKitTimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SenderKitNetworkError extends SenderKitError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SenderKitNetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
