import type { ReactElement } from "react";
import { describe, expect, it, expectTypeOf } from "vitest";
import { defineTemplate, SenderKitReactEmailError } from "../src/index";

interface WelcomeProps {
  name: string;
  loginUrl: string;
}

function WelcomeEmail(_props: WelcomeProps): ReactElement | null {
  return null;
}

describe("defineTemplate", () => {
  it("returns the config unchanged", () => {
    const config = {
      id: "welcome-email",
      name: "Welcome",
      previewData: { name: "John", loginUrl: "https://example.com" },
      component: WelcomeEmail,
    };
    const tpl = defineTemplate(config);
    expect(tpl).toBe(config);
  });

  it("infers props from the component", () => {
    const tpl = defineTemplate({
      id: "welcome-email",
      previewData: { name: "John", loginUrl: "https://example.com" },
      component: WelcomeEmail,
    });
    expectTypeOf(tpl.previewData).toEqualTypeOf<WelcomeProps>();
  });

  it("accepts an explicit generic", () => {
    const tpl = defineTemplate<WelcomeProps>({
      id: "welcome-email",
      previewData: { name: "John", loginUrl: "https://example.com" },
      component: WelcomeEmail,
    });
    expectTypeOf(tpl.previewData).toEqualTypeOf<WelcomeProps>();
  });

  it("throws when id is missing", () => {
    expect(() =>
      defineTemplate({
        // @ts-expect-error testing runtime validation
        id: undefined,
        previewData: { name: "John", loginUrl: "x" },
        component: WelcomeEmail,
      }),
    ).toThrow(SenderKitReactEmailError);
  });

  it("throws when component is missing", () => {
    expect(() =>
      defineTemplate({
        id: "welcome-email",
        previewData: { name: "John", loginUrl: "x" },
        // @ts-expect-error testing runtime validation
        component: undefined,
      }),
    ).toThrow(/component/);
  });

  it("throws when previewData is missing", () => {
    expect(() =>
      defineTemplate({
        id: "welcome-email",
        // @ts-expect-error testing runtime validation
        previewData: undefined,
        component: WelcomeEmail,
      }),
    ).toThrow(/previewData/);
  });

  it("preserves all metadata fields", () => {
    const tpl = defineTemplate({
      id: "welcome-email",
      name: "Welcome",
      description: "Sent on signup",
      subject: "Welcome to our app",
      previewText: "Get started in 60 seconds",
      previewData: { name: "John", loginUrl: "https://example.com" },
      tags: ["auth", "onboarding"],
      locale: "en-US",
      version: "1.0.0",
      component: WelcomeEmail,
    });
    expect(tpl.name).toBe("Welcome");
    expect(tpl.description).toBe("Sent on signup");
    expect(tpl.tags).toEqual(["auth", "onboarding"]);
    expect(tpl.locale).toBe("en-US");
    expect(tpl.version).toBe("1.0.0");
  });
});
