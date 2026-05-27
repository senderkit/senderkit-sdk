import type { z } from "zod";

export type FieldKind = "string" | "number" | "boolean" | "enum" | "json";

export interface FieldInfo {
  optional: boolean;
  kind: FieldKind;
  description?: string;
  enumValues?: string[];
}

interface ZodDefLike {
  typeName?: string;
  description?: string;
  innerType?: { _def: ZodDefLike };
  schema?: { _def: ZodDefLike };
  values?: string[];
}

/** Inspect a single zod field, unwrapping optional/default/effects wrappers. */
export function describeField(field: z.ZodTypeAny): FieldInfo {
  let cur = field as unknown as { _def: ZodDefLike };
  let optional = false;
  let description: string | undefined;

  // Walk down wrapper types to the concrete schema.
  for (;;) {
    const def = cur._def;
    if (def.description && !description) description = def.description;
    const tn = def.typeName;
    if (tn === "ZodOptional" || tn === "ZodDefault") {
      optional = true;
      cur = def.innerType as { _def: ZodDefLike };
      continue;
    }
    if (tn === "ZodEffects") {
      cur = def.schema as { _def: ZodDefLike };
      continue;
    }
    break;
  }

  const def = cur._def;
  switch (def.typeName) {
    case "ZodNumber":
      return { optional, kind: "number", description };
    case "ZodBoolean":
      return { optional, kind: "boolean", description };
    case "ZodEnum":
      return { optional, kind: "enum", description, enumValues: def.values };
    case "ZodRecord":
    case "ZodObject":
    case "ZodArray":
      return { optional, kind: "json", description };
    default:
      return { optional, kind: "string", description };
  }
}

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
