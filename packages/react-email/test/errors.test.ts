import { describe, expect, it } from "vitest";
import {
  SenderKitReactEmailError,
  TemplateRenderError,
  TemplateValidationError,
} from "../src/index.js";

describe("errors", () => {
  it("base error carries templateId and cause", () => {
    const cause = new Error("root");
    const err = new SenderKitReactEmailError("oops", { templateId: "welcome", cause });
    expect(err.message).toBe("oops");
    expect(err.name).toBe("SenderKitReactEmailError");
    expect(err.templateId).toBe("welcome");
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  it("TemplateValidationError extends the base", () => {
    const err = new TemplateValidationError("bad", {
      templateId: "welcome",
      issues: [{ path: ["name"] }],
    });
    expect(err).toBeInstanceOf(TemplateValidationError);
    expect(err).toBeInstanceOf(SenderKitReactEmailError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("TemplateValidationError");
    expect(err.templateId).toBe("welcome");
    expect(err.issues).toEqual([{ path: ["name"] }]);
  });

  it("TemplateRenderError extends the base", () => {
    const cause = new Error("render boom");
    const err = new TemplateRenderError("render failed", { templateId: "welcome", cause });
    expect(err).toBeInstanceOf(TemplateRenderError);
    expect(err).toBeInstanceOf(SenderKitReactEmailError);
    expect(err.name).toBe("TemplateRenderError");
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  it("instanceof works after JSON-style serialization round-trip is irrelevant — but distinct subclasses are distinguishable", () => {
    const validation = new TemplateValidationError("v");
    const render = new TemplateRenderError("r");
    expect(validation instanceof TemplateRenderError).toBe(false);
    expect(render instanceof TemplateValidationError).toBe(false);
  });
});
