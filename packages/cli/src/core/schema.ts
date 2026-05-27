import { z } from "zod";

/**
 * A free-form object field. Accepts a real object (MCP) or a JSON string (CLI),
 * parsing the string before validation. Invalid JSON falls through to the
 * record check, producing a clear "expected object" error.
 */
export function jsonRecord(description: string) {
  return z
    .preprocess((value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.record(z.unknown()))
    .describe(description);
}

/** Metadata values are limited to scalars on the wire. */
export function metadataRecord(description: string) {
  return z
    .preprocess((value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.record(z.union([z.string(), z.number(), z.boolean()])))
    .describe(description);
}

export const channelEnum = z.enum(["email", "sms", "push"]);
