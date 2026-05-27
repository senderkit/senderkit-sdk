# @senderkit/react-email

> React Email is for authoring email templates. **`@senderkit/react-email` makes those templates production-ready for SenderKit workflows.**

A small, focused bridge between [React Email](https://react.email) and [SenderKit](https://senderkit.com). Wrap a React Email component with metadata — id, subject, preview data, tags, locale, optional schema — so SenderKit (and a future `senderkit sync` CLI) can ship it to production.

- **Strongly typed** — `defineTemplate` infers props from your component
- **Tiny surface area** — `defineTemplate`, `createTemplateManifest`, `renderTemplate`
- **Validation-friendly** — bring your own Zod / Valibot / hand-rolled schema
- **ESM + CJS**, generated `.d.ts` / `.d.cts`, zero runtime dependencies
- **No editor, no sender, no workflow engine** — those belong elsewhere

## What this package does NOT do

- It does **not** clone or replace React Email — keep authoring in JSX with `@react-email/components`.
- It does **not** ship a visual editor or preview server.
- It does **not** send mail. Use [`@senderkit/sdk`](../sdk) for that.
- It does **not** orchestrate workflows or pick providers.
- It does **not** interpolate `{{handlebars}}` strings — use the function form for dynamic subjects.

## Install

```bash
npm install @senderkit/react-email react @react-email/render
# or
pnpm add @senderkit/react-email react @react-email/render
```

`react` and `@react-email/render` are **peer dependencies**. `@react-email/render` is optional — you only need it if you call `renderTemplate`. A CLI that only reads metadata can skip it.

## Basic usage

```tsx
import { defineTemplate } from "@senderkit/react-email";

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <div>
      <h1>Welcome, {name}</h1>
      <a href={loginUrl}>Log in</a>
    </div>
  );
}

export default defineTemplate({
  id: "welcome-email",
  name: "Welcome Email",
  description: "Sent when a user signs up",
  subject: "Welcome to our app",
  previewData: {
    name: "John",
    loginUrl: "https://example.com/login",
  },
  tags: ["auth", "onboarding"],
  component: WelcomeEmail,
});
```

`previewData` autocompletes against the component's prop type — there's no separate `<Props>` annotation to keep in sync.

## Dynamic subject

```tsx
defineTemplate({
  id: "welcome-email",
  subject: ({ name }) => `Welcome, ${name}!`,
  previewData: { name: "John", loginUrl: "https://example.com" },
  component: WelcomeEmail,
});
```

`subject` and `previewText` accept either a literal string or a `(props) => string` function. The manifest records which form was used, so a sync CLI can branch on `kind: "static" | "dynamic"`.

## Manifest generation

`createTemplateManifest` returns a JSON-serializable description of the template. The React component is intentionally omitted — manifests are meant to be persisted to disk, sent to a dashboard, or compared in CI.

```ts
import { createTemplateManifest } from "@senderkit/react-email";
import welcome from "./welcome-email.js";

const manifest = createTemplateManifest(welcome);
// {
//   id: "welcome-email",
//   name: "Welcome Email",
//   description: "Sent when a user signs up",
//   tags: ["auth", "onboarding"],
//   previewData: { name: "John", loginUrl: "https://example.com/login" },
//   subject: { kind: "static", value: "Welcome to our app" },
//   hasSchema: false,
// }

await fs.writeFile("manifest.json", JSON.stringify(manifest, null, 2));
```

## Rendering

`renderTemplate` produces HTML (and plain text by default) using `@react-email/render`. With no second argument, it renders against `previewData` — handy for previews and CI snapshots.

```ts
import { renderTemplate } from "@senderkit/react-email";
import welcome from "./welcome-email.js";

// Render with preview data
const preview = await renderTemplate(welcome);

// Render with real props
const result = await renderTemplate(welcome, {
  name: "Casey",
  loginUrl: "https://app.example.com/login?u=casey",
});

result.html;        // string
result.text;        // string (omit by passing { plainText: false })
result.subject;     // resolved against props
result.previewText; // resolved against props
```

## Validation with Zod

Pass any object that exposes `parse(data: unknown): Props`. Zod, Valibot, ArkType, and hand-written validators all qualify.

```tsx
import { z } from "zod";
import { defineTemplate } from "@senderkit/react-email";

const WelcomeProps = z.object({
  name: z.string().min(1),
  loginUrl: z.string().url(),
});
type WelcomeProps = z.infer<typeof WelcomeProps>;

export default defineTemplate({
  id: "welcome-email",
  schema: WelcomeProps,
  previewData: { name: "John", loginUrl: "https://example.com/login" },
  component: WelcomeEmail,
});
```

When `renderTemplate` is called, props pass through `schema.parse` first. If validation fails, the thrown `TemplateValidationError` carries the original `issues` from your validator.

## Errors

| Class | When it fires |
| --- | --- |
| `TemplateValidationError` | `schema.parse` rejected the props |
| `TemplateRenderError` | `@react-email/render` failed, or the peer is not installed |
| `SenderKitReactEmailError` | base class — catch this to handle them all |

```ts
import {
  SenderKitReactEmailError,
  TemplateValidationError,
} from "@senderkit/react-email";

try {
  await renderTemplate(welcome, untrustedInput);
} catch (err) {
  if (err instanceof TemplateValidationError) {
    console.error("Invalid props for", err.templateId, err.issues);
  } else if (err instanceof SenderKitReactEmailError) {
    console.error("Template error:", err.message);
  } else {
    throw err;
  }
}
```

## Working with the future SenderKit CLI

A `senderkit` CLI is on the roadmap. The intended workflow is:

```bash
senderkit sync ./emails
```

It will collect every `defineTemplate(...)` default export under `./emails`, call `createTemplateManifest` on each, and push the manifests to your SenderKit project — keeping dashboard, validation rules, and template metadata in lockstep with your code.

You can already prototype this today by gluing `import("./emails/welcome-email.js")` to `createTemplateManifest`.

## API

### `defineTemplate<TProps>(config)`

Identity helper that validates the config shape and preserves the literal type of `previewData`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable identifier (e.g. `"welcome-email"`). |
| `name` | `string` | no | Display name. |
| `description` | `string` | no | Short description for dashboards. |
| `subject` | `string \| (props) => string` | no | Static or derived. |
| `previewText` | `string \| (props) => string` | no | Inbox preview. |
| `previewData` | `TProps` | yes | Autocompletes against the component's prop type. |
| `tags` | `readonly string[]` | no | Free-form labels. |
| `locale` | `string` | no | BCP-47 locale tag. |
| `version` | `string` | no | Author-managed version. |
| `schema` | `{ parse(data): TProps }` | no | Zod / Valibot / etc. |
| `component` | `ComponentType<TProps>` | yes | The React Email component. |

### `createTemplateManifest(template)`

Returns a `TemplateManifest` — JSON-safe, no React component, with `subject` / `previewText` collapsed to `{ kind, value? }`.

### `renderTemplate(template, props?, options?)`

Async. Returns `{ html, text?, subject?, previewText? }`. Uses `previewData` when `props` is omitted, runs `schema.parse` when a schema is defined, and resolves `subject` / `previewText` against the validated props.

| Option | Default | Notes |
| --- | --- | --- |
| `plainText` | `true` | Set to `false` to skip the plain-text render. |

## License

MIT
