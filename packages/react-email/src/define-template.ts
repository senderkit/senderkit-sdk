import { SenderKitReactEmailError } from "./errors";
import type { TemplateDefinition } from "./types";

/**
 * Define a SenderKit-ready React Email template.
 *
 * Acts as an identity function that preserves the literal type of `previewData`
 * and infers `TProps` from the component when annotated:
 *
 * ```ts
 * defineTemplate({
 *   id: "welcome-email",
 *   previewData: { name: "John" },
 *   component: WelcomeEmail,
 * });
 * ```
 *
 * The generic can also be passed explicitly:
 *
 * ```ts
 * defineTemplate<WelcomeEmailProps>({...});
 * ```
 */
export function defineTemplate<TProps>(
  config: TemplateDefinition<TProps>,
): TemplateDefinition<TProps> {
  if (!config.id || typeof config.id !== "string") {
    throw new SenderKitReactEmailError("defineTemplate: `id` is required and must be a string");
  }
  if (!config.component) {
    throw new SenderKitReactEmailError("defineTemplate: `component` is required", {
      templateId: config.id,
    });
  }
  if (config.previewData === undefined) {
    throw new SenderKitReactEmailError("defineTemplate: `previewData` is required", {
      templateId: config.id,
    });
  }
  return config;
}
