import { describe, expect, it, vi } from "vitest";
import {
  defineTemplate,
  renderTemplate,
  TemplateRenderError,
  TemplateValidationError,
} from "../src/index";

interface WelcomeProps {
  name: string;
  loginUrl: string;
}

function WelcomeEmail({ name, loginUrl }: WelcomeProps) {
  return (
    <div>
      <h1>Welcome, {name}</h1>
      <a href={loginUrl}>Log in</a>
    </div>
  );
}

const welcomeTemplate = defineTemplate({
  id: "welcome-email",
  subject: ({ name }) => `Welcome, ${name}`,
  previewText: "Get started in 60 seconds",
  previewData: { name: "John", loginUrl: "https://example.com/login" },
  component: WelcomeEmail,
});

describe("renderTemplate", () => {
  it("renders HTML using preview data when no props are passed", async () => {
    const result = await renderTemplate(welcomeTemplate);
    // React 19 inserts <!-- --> between text fragments, so match on the variable parts.
    expect(result.html).toContain("John");
    expect(result.html).toContain("https://example.com/login");
    expect(result.html).toContain("<h1>");
  });

  it("renders HTML with custom props", async () => {
    const result = await renderTemplate(welcomeTemplate, {
      name: "Casey",
      loginUrl: "https://example.com/casey",
    });
    expect(result.html).toContain("Casey");
    expect(result.html).toContain("https://example.com/casey");
  });

  it("returns plain text by default", async () => {
    const result = await renderTemplate(welcomeTemplate);
    expect(result.text).toBeDefined();
    // react-email uppercases <h1> in plain-text rendering.
    expect(result.text?.toLowerCase()).toContain("john");
    expect(result.text).toContain("https://example.com/login");
  });

  it("skips plain text when plainText: false", async () => {
    const result = await renderTemplate(welcomeTemplate, undefined, { plainText: false });
    expect(result.text).toBeUndefined();
  });

  it("resolves a function-form subject against props", async () => {
    const result = await renderTemplate(welcomeTemplate, {
      name: "Casey",
      loginUrl: "https://example.com",
    });
    expect(result.subject).toBe("Welcome, Casey");
  });

  it("returns a static subject as-is", async () => {
    const tpl = defineTemplate({
      id: "static-subject",
      subject: "Hi there",
      previewData: { name: "John", loginUrl: "x" },
      component: WelcomeEmail,
    });
    const result = await renderTemplate(tpl);
    expect(result.subject).toBe("Hi there");
  });

  it("returns previewText (static and dynamic)", async () => {
    const staticResult = await renderTemplate(welcomeTemplate);
    expect(staticResult.previewText).toBe("Get started in 60 seconds");

    const dynamicTpl = defineTemplate({
      id: "dynamic-preview",
      previewText: ({ name }) => `Hi ${name}`,
      previewData: { name: "John", loginUrl: "x" },
      component: WelcomeEmail,
    });
    const dynamicResult = await renderTemplate(dynamicTpl, { name: "Sky", loginUrl: "x" });
    expect(dynamicResult.previewText).toBe("Hi Sky");
  });

  it("validates props with the provided schema", async () => {
    const calls: unknown[] = [];
    const tpl = defineTemplate({
      id: "with-schema",
      previewData: { name: "John", loginUrl: "x" },
      schema: {
        parse(data) {
          calls.push(data);
          return data as WelcomeProps;
        },
      },
      component: WelcomeEmail,
    });
    await renderTemplate(tpl, { name: "Casey", loginUrl: "y" });
    expect(calls).toEqual([{ name: "Casey", loginUrl: "y" }]);
  });

  it("wraps schema failures in TemplateValidationError", async () => {
    class FakeZodError extends Error {
      readonly issues = [{ path: ["name"], message: "Required" }];
    }
    const tpl = defineTemplate({
      id: "bad-schema",
      previewData: { name: "John", loginUrl: "x" },
      schema: {
        parse() {
          throw new FakeZodError("invalid");
        },
      },
      component: WelcomeEmail,
    });

    await expect(renderTemplate(tpl, {})).rejects.toMatchObject({
      name: "TemplateValidationError",
      templateId: "bad-schema",
      issues: [{ path: ["name"], message: "Required" }],
    });
    await expect(renderTemplate(tpl, {})).rejects.toBeInstanceOf(TemplateValidationError);
  });

  it("throws TemplateRenderError when @react-email/render is missing", async () => {
    vi.resetModules();
    vi.doMock("@react-email/render", () => {
      throw new Error("Cannot find module '@react-email/render'");
    });

    const freshRender = await import("../src/render");
    const freshErrors = await import("../src/errors");

    await expect(freshRender.renderTemplate(welcomeTemplate)).rejects.toBeInstanceOf(
      freshErrors.TemplateRenderError,
    );
    await expect(freshRender.renderTemplate(welcomeTemplate)).rejects.toMatchObject({
      name: "TemplateRenderError",
      message: expect.stringContaining("@react-email/render"),
    });

    vi.doUnmock("@react-email/render");
    vi.resetModules();
  });
});
