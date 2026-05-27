import pc from "picocolors";

/** Render rows as a left-aligned column table with a dim header. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );
  const pad = (cells: string[]) =>
    cells.map((c, i) => String(c ?? "").padEnd(widths[i] ?? 0)).join("  ");
  const lines = [pc.dim(pad(headers)), ...rows.map((r) => pad(r))];
  return lines.join("\n");
}

/** Render an object as aligned `key: value` lines. */
export function keyValues(entries: Record<string, unknown>): string {
  const keys = Object.keys(entries);
  const width = Math.max(0, ...keys.map((k) => k.length));
  return keys
    .map((k) => `${pc.dim(`${k}:`.padEnd(width + 1))} ${formatValue(entries[k])}`)
    .join("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return pc.dim("—");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function success(message: string): string {
  return `${pc.green("✓")} ${message}`;
}
