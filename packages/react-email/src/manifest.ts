import type { ManifestField, TemplateDefinition, TemplateManifest } from "./types.js";

function describeField<TProps>(
  field: string | ((props: TProps) => string) | undefined,
): ManifestField | undefined {
  if (field === undefined) return undefined;
  if (typeof field === "function") return { kind: "dynamic" };
  return { kind: "static", value: field };
}

/**
 * Produce a JSON-serializable manifest of a template's metadata. The React
 * component is intentionally omitted so the result can be sent to a dashboard,
 * persisted to disk, or compared in CI by a future `senderkit sync` CLI.
 */
export function createTemplateManifest<TProps>(
  template: TemplateDefinition<TProps>,
): TemplateManifest {
  const manifest: TemplateManifest = {
    id: template.id,
    previewData: template.previewData,
    hasSchema: template.schema !== undefined,
  };

  if (template.name !== undefined) manifest.name = template.name;
  if (template.description !== undefined) manifest.description = template.description;
  if (template.tags !== undefined) manifest.tags = template.tags;
  if (template.locale !== undefined) manifest.locale = template.locale;
  if (template.version !== undefined) manifest.version = template.version;

  const subject = describeField(template.subject);
  if (subject) manifest.subject = subject;

  const previewText = describeField(template.previewText);
  if (previewText) manifest.previewText = previewText;

  return manifest;
}
