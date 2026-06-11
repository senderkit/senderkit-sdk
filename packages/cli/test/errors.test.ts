import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SenderKitApiError,
  SenderKitAuthenticationError,
  SenderKitNetworkError,
  SenderKitPermissionError,
  SenderKitRateLimitError,
  SenderKitTimeoutError,
  SenderKitValidationError,
} from "@senderkit/sdk";
import { ZodError } from "zod";
import { describeError, describeErrorAsObject, handleError, setJsonMode } from "../src/cli/errors";
import { MissingApiKeyError } from "../src/core/context";

describe("describeErrorAsObject", () => {
  it("maps SenderKit error subclasses to typed payloads", () => {
    const auth = new SenderKitAuthenticationError({ status: 401, message: "bad key", requestId: "req_1" });
    expect(describeErrorAsObject(auth)).toMatchObject({
      type: "authentication",
      status: 401,
      requestId: "req_1",
    });

    const validation = new SenderKitValidationError({
      status: 422,
      message: "missing field",
      issues: [{ path: "to" }],
    });
    expect(describeErrorAsObject(validation)).toMatchObject({
      type: "validation",
      status: 422,
      issues: [{ path: "to" }],
    });

    const permission = new SenderKitPermissionError({
      status: 403,
      message: 'This connection is missing the required "send" scope.',
      code: "insufficient_scope",
      requestId: "req_2",
    });
    expect(describeErrorAsObject(permission)).toMatchObject({
      type: "permission",
      status: 403,
      requestId: "req_2",
    });
    // Must not be misclassified as authentication or the generic api type.
    expect(describeErrorAsObject(permission).type).toBe("permission");
    expect(describeError(permission)).toMatch(/scope/i);

    const rate = new SenderKitRateLimitError({
      status: 429,
      message: "slow down",
      retryAfter: 5000,
    });
    expect(describeErrorAsObject(rate)).toMatchObject({
      type: "rate_limit",
      status: 429,
      retryAfter: 5000,
    });

    expect(describeErrorAsObject(new SenderKitTimeoutError())).toMatchObject({
      type: "timeout",
    });
    expect(describeErrorAsObject(new SenderKitNetworkError("offline"))).toMatchObject({
      type: "network",
      message: "offline",
    });
    expect(
      describeErrorAsObject(new SenderKitApiError({ status: 500, message: "boom" })),
    ).toMatchObject({ type: "api", status: 500 });
  });

  it("maps non-SDK errors", () => {
    const zod = new ZodError([
      { code: "custom", message: "bad", path: ["x"] } as never,
    ]);
    expect(describeErrorAsObject(zod)).toMatchObject({
      type: "validation",
      message: "Invalid input",
    });
    expect(describeErrorAsObject(new MissingApiKeyError())).toMatchObject({
      type: "missing_api_key",
    });
    expect(describeErrorAsObject(new Error("nope"))).toMatchObject({
      type: "unknown",
      message: "nope",
    });
  });
});

describe("handleError in JSON mode", () => {
  afterEach(() => {
    setJsonMode(false);
    vi.restoreAllMocks();
  });

  it("emits a single JSON line to stderr and exits non-zero", () => {
    setJsonMode(true);
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    expect(() => handleError(new SenderKitTimeoutError())).toThrow(/exit:1/);

    expect(write).toHaveBeenCalledTimes(1);
    const payload = write.mock.calls[0]![0] as string;
    expect(payload.endsWith("\n")).toBe(true);
    expect(JSON.parse(payload)).toEqual({
      error: { type: "timeout", message: "Request timed out." },
    });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("falls back to plain text when JSON mode is off", () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    expect(() => handleError(new Error("oops"))).toThrow(/exit:1/);
    const payload = write.mock.calls[0]![0] as string;
    expect(payload).toContain("oops");
    expect(() => JSON.parse(payload)).toThrow();
  });
});
