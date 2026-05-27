import type { ComponentType } from "react";

export interface TemplateSchema<TProps> {
  parse(data: unknown): TProps;
}

export type SubjectField<TProps> = string | ((props: TProps) => string);
export type PreviewTextField<TProps> = string | ((props: TProps) => string);

export interface TemplateDefinition<TProps> {
  /** Stable identifier used by SenderKit to reference this template (e.g. "welcome-email"). */
  id: string;
  /** Human-readable name shown in dashboards and tooling. */
  name?: string;
  /** Short description of when this template fires. */
  description?: string;
  /** Static subject string, or a function that derives the subject from props. */
  subject?: SubjectField<TProps>;
  /** Inbox preview text. Static or derived from props. */
  previewText?: PreviewTextField<TProps>;
  /** Sample props used for previews and as the default for `renderTemplate`. */
  previewData: TProps;
  /** Free-form labels for grouping (e.g. ["auth", "onboarding"]). */
  tags?: readonly string[];
  /** BCP-47 locale tag (e.g. "en-US"). */
  locale?: string;
  /** Author-managed version string (e.g. "1.0.0"). */
  version?: string;
  /** Optional structural validator. Compatible with Zod, Valibot, etc. */
  schema?: TemplateSchema<TProps>;
  /** The React Email component to render. */
  component: ComponentType<TProps>;
}

export interface RenderResult {
  html: string;
  text?: string;
  subject?: string;
  previewText?: string;
}

export interface ManifestField {
  kind: "static" | "dynamic";
  value?: string;
}

export interface TemplateManifest {
  id: string;
  name?: string;
  description?: string;
  tags?: readonly string[];
  locale?: string;
  version?: string;
  previewData: unknown;
  subject?: ManifestField;
  previewText?: ManifestField;
  hasSchema: boolean;
}
