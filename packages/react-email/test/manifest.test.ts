import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { createTemplateManifest, defineTemplate } from "../src/index";

interface Props {
  name: string;
}

function Email(_: Props): ReactElement | null {
  return null;
}

const baseTemplate = {
  id: "welcome-email",
  previewData: { name: "John" },
  component: Email,
} as const;

describe("createTemplateManifest", () => {
  it("includes core metadata", () => {
    const manifest = createTemplateManifest(
      defineTemplate({
        ...baseTemplate,
        name: "Welcome",
        description: "Sent on signup",
        tags: ["auth"],
        locale: "en-US",
        version: "1.0.0",
      }),
    );

    expect(manifest.id).toBe("welcome-email");
    expect(manifest.name).toBe("Welcome");
    expect(manifest.description).toBe("Sent on signup");
    expect(manifest.tags).toEqual(["auth"]);
    expect(manifest.locale).toBe("en-US");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.previewData).toEqual({ name: "John" });
  });

  it("describes a static subject", () => {
    const manifest = createTemplateManifest(
      defineTemplate({ ...baseTemplate, subject: "Welcome!" }),
    );
    expect(manifest.subject).toEqual({ kind: "static", value: "Welcome!" });
  });

  it("describes a dynamic subject without leaking the function", () => {
    const manifest = createTemplateManifest(
      defineTemplate({
        ...baseTemplate,
        subject: ({ name }) => `Hello ${name}`,
      }),
    );
    expect(manifest.subject).toEqual({ kind: "dynamic" });
  });

  it("describes preview text the same way", () => {
    const staticManifest = createTemplateManifest(
      defineTemplate({ ...baseTemplate, previewText: "Inbox preview" }),
    );
    expect(staticManifest.previewText).toEqual({ kind: "static", value: "Inbox preview" });

    const dynamicManifest = createTemplateManifest(
      defineTemplate({
        ...baseTemplate,
        previewText: ({ name }) => `Hi ${name}`,
      }),
    );
    expect(dynamicManifest.previewText).toEqual({ kind: "dynamic" });
  });

  it("omits subject and previewText when not provided", () => {
    const manifest = createTemplateManifest(defineTemplate(baseTemplate));
    expect(manifest.subject).toBeUndefined();
    expect(manifest.previewText).toBeUndefined();
  });

  it("reports schema presence without including it", () => {
    const withSchema = createTemplateManifest(
      defineTemplate({
        ...baseTemplate,
        schema: { parse: (data) => data as Props },
      }),
    );
    expect(withSchema.hasSchema).toBe(true);

    const withoutSchema = createTemplateManifest(defineTemplate(baseTemplate));
    expect(withoutSchema.hasSchema).toBe(false);
  });

  it("never includes the React component", () => {
    const manifest = createTemplateManifest(defineTemplate(baseTemplate));
    expect("component" in manifest).toBe(false);
  });

  it("round-trips through JSON.stringify", () => {
    const manifest = createTemplateManifest(
      defineTemplate({
        ...baseTemplate,
        name: "Welcome",
        subject: "Welcome!",
        previewText: ({ name }) => name,
      }),
    );
    const json = JSON.stringify(manifest);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("welcome-email");
    expect(parsed.subject).toEqual({ kind: "static", value: "Welcome!" });
    expect(parsed.previewText).toEqual({ kind: "dynamic" });
  });
});
