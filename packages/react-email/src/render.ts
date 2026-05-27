import { createElement, type ComponentType } from "react";
import { TemplateRenderError, TemplateValidationError } from "./errors.js";
import type { RenderResult, TemplateDefinition } from "./types.js";

export interface RenderTemplateOptions {
  /** When true (default), also render a plain-text version. */
  plainText?: boolean;
}

interface ReactEmailRenderModule {
  render: (component: ReturnType<typeof createElement>, options?: { plainText?: boolean }) =>
    | string
    | Promise<string>;
}

async function loadRender(templateId: string): Promise<ReactEmailRenderModule["render"]> {
  try {
    const mod = (await import("@react-email/render")) as ReactEmailRenderModule;
    return mod.render;
  } catch (cause) {
    throw new TemplateRenderError(
      "Could not load `@react-email/render`. Install it as a dependency to use renderTemplate().",
      { templateId, cause },
    );
  }
}

function resolveField<TProps>(
  field: string | ((props: TProps) => string) | undefined,
  props: TProps,
): string | undefined {
  if (field === undefined) return undefined;
  return typeof field === "function" ? field(props) : field;
}

function validateProps<TProps>(
  template: TemplateDefinition<TProps>,
  rawProps: unknown,
): TProps {
  if (!template.schema) return rawProps as TProps;
  try {
    return template.schema.parse(rawProps);
  } catch (cause) {
    const issues = (cause as { issues?: unknown })?.issues;
    throw new TemplateValidationError(
      `Template "${template.id}" failed schema validation`,
      { templateId: template.id, issues, cause },
    );
  }
}

/**
 * Render a template to HTML (and optionally plain text) using
 * `@react-email/render`. Falls back to `template.previewData` when no props
 * are provided, runs `template.schema.parse` if a schema is defined, and
 * resolves `subject` / `previewText` against the validated props.
 */
export async function renderTemplate<TProps>(
  template: TemplateDefinition<TProps>,
  rawProps?: unknown,
  options: RenderTemplateOptions = {},
): Promise<RenderResult> {
  const propsInput = rawProps === undefined ? template.previewData : rawProps;
  const props = validateProps(template, propsInput);

  const render = await loadRender(template.id);
  // Cast to a permissive component type — createElement's generic resolution
  // can't unify TProps with the overload's default `{}` parameter shape.
  const Component = template.component as ComponentType<unknown>;
  const element = createElement(Component, props as object);

  let html: string;
  try {
    html = await Promise.resolve(render(element));
  } catch (cause) {
    throw new TemplateRenderError(`Template "${template.id}" failed to render`, {
      templateId: template.id,
      cause,
    });
  }

  const result: RenderResult = { html };

  if (options.plainText !== false) {
    try {
      result.text = await Promise.resolve(render(element, { plainText: true }));
    } catch (cause) {
      throw new TemplateRenderError(
        `Template "${template.id}" failed to render plain text`,
        { templateId: template.id, cause },
      );
    }
  }

  const subject = resolveField(template.subject, props);
  if (subject !== undefined) result.subject = subject;

  const previewText = resolveField(template.previewText, props);
  if (previewText !== undefined) result.previewText = previewText;

  return result;
}
