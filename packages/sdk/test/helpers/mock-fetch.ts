export interface MockCall {
  url: string;
  init: RequestInit;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** If set, fetch will reject with this error instead of returning a response. */
  throw?: Error;
  /** Artificial delay before resolving. */
  delayMs?: number;
}

export interface MockFetch {
  fetch: typeof fetch;
  calls: MockCall[];
  enqueue: (...responses: MockResponse[]) => void;
}

export function createMockFetch(initial: MockResponse[] = []): MockFetch {
  const queue: MockResponse[] = [...initial];
  const calls: MockCall[] = [];

  const fn: typeof fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = (init.method ?? "GET").toUpperCase();
    const headers = normalizeHeaders(init.headers);
    let body: unknown = undefined;
    if (init.body !== undefined && init.body !== null) {
      try {
        body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, init, method, headers, body });

    const next = queue.shift();
    if (!next) {
      throw new Error(`mock fetch: no response queued for ${method} ${url}`);
    }

    if (next.delayMs && next.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, next.delayMs);
        const signal = init.signal;
        if (signal) {
          if (signal.aborted) {
            clearTimeout(timer);
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
          }
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    }

    if (next.throw) throw next.throw;

    const responseBody =
      next.body === undefined ? "" : typeof next.body === "string" ? next.body : JSON.stringify(next.body);
    return new Response(responseBody, {
      status: next.status ?? 200,
      headers: {
        "content-type": "application/json",
        ...(next.headers ?? {}),
      },
    });
  };

  return {
    fetch: fn,
    calls,
    enqueue: (...responses) => queue.push(...responses),
  };
}

function normalizeHeaders(input: RequestInit["headers"]): Record<string, string> {
  if (!input) return {};
  if (input instanceof Headers) {
    const out: Record<string, string> = {};
    input.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(input)) {
    const out: Record<string, string> = {};
    for (const entry of input) {
      const k = entry[0];
      const v = entry[1];
      if (k !== undefined && v !== undefined) {
        out[k.toLowerCase()] = v;
      }
    }
    return out;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k.toLowerCase()] = String(v);
  }
  return out;
}
