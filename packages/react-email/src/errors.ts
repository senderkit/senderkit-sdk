export class SenderKitReactEmailError extends Error {
  readonly templateId: string | undefined;

  constructor(message: string, options?: { templateId?: string; cause?: unknown }) {
    super(message);
    this.name = "SenderKitReactEmailError";
    this.templateId = options?.templateId;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TemplateValidationError extends SenderKitReactEmailError {
  readonly issues: unknown;

  constructor(
    message: string,
    options?: { templateId?: string; issues?: unknown; cause?: unknown },
  ) {
    super(message, options);
    this.name = "TemplateValidationError";
    this.issues = options?.issues;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TemplateRenderError extends SenderKitReactEmailError {
  constructor(message: string, options?: { templateId?: string; cause?: unknown }) {
    super(message, options);
    this.name = "TemplateRenderError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
