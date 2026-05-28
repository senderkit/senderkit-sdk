export type FieldKind = "string" | "number" | "boolean" | "enum" | "json";

export interface FieldInfo {
  optional: boolean;
  kind: FieldKind;
  description?: string;
  enumValues?: string[];
}

interface ZodDefLike {
  type?: string;
  innerType?: { _def: ZodDefLike; description?: string };
  // ZodPipe (Zod 4): used by preprocess to wrap the inner schema.
  out?: { _def: ZodDefLike; description?: string };
  in?: { _def: ZodDefLike };
  entries?: Record<string, unknown>;
  values?: string[];
  description?: string;
}

interface ZodFieldLike {
  _def: ZodDefLike;
  description?: string;
}

function readDescription(field: ZodFieldLike): string | undefined {
  // Zod 4 stores `.describe(…)` in z.globalRegistry, exposed as `.description`.
  // Fall back to `_def.description` for older shapes / direct construction.
  return field.description ?? field._def?.description;
}

/** Inspect a single zod field, unwrapping optional/default/preprocess wrappers. */
export function describeField(field: unknown): FieldInfo {
  let cur = field as unknown as ZodFieldLike;
  let optional = false;
  let description: string | undefined;

  // Walk wrappers down to the concrete schema. Description is captured from
  // whichever layer set it first (outer-most wins).
  for (;;) {
    const desc = readDescription(cur);
    if (desc && !description) description = desc;

    const def = cur._def ?? {};
    const t = def.type;

    if (t === "optional" || t === "default" || t === "prefault" || t === "nullable") {
      optional = true;
      if (!def.innerType) break;
      cur = def.innerType as ZodFieldLike;
      continue;
    }
    // z.preprocess(fn, inner) is a ZodPipe whose `out` is the inner schema.
    if (t === "pipe" && def.out) {
      cur = def.out as ZodFieldLike;
      continue;
    }
    break;
  }

  const def = cur._def ?? {};
  switch (def.type) {
    case "number":
    case "int":
      return { optional, kind: "number", description };
    case "boolean":
      return { optional, kind: "boolean", description };
    case "enum": {
      // Zod 4 stores enum members on `_def.entries` (object keyed by value).
      const values = def.entries
        ? Object.keys(def.entries)
        : Array.isArray(def.values)
          ? def.values
          : undefined;
      return { optional, kind: "enum", description, enumValues: values };
    }
    case "record":
    case "object":
    case "array":
      return { optional, kind: "json", description };
    default:
      return { optional, kind: "string", description };
  }
}

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
