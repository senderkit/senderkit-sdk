import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { runCommand } from "../src/cli/adapter";
import { describeField } from "../src/cli/introspect";
import { sendCommand } from "../src/core/commands/send";
import { templatesGetCommand } from "../src/core/commands/templates-get";
import { messagesListCommand } from "../src/core/commands/messages-list";
import { stubClient } from "./helpers";

function captureStdout() {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((c: string | Uint8Array) => {
      chunks.push(String(c));
      return true;
    });
  return { chunks, spy };
}

afterEach(() => vi.restoreAllMocks());

describe("runCommand", () => {
  it("parses a JSON string for object fields and prints human output", async () => {
    const { client, calls } = stubClient();
    const { chunks } = captureStdout();
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", data: '{"name":"Jo"}' },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ data: { name: "Jo" } });
    expect(chunks.join("")).toContain("Queued message");
  });

  it("prints raw JSON when --json is set", async () => {
    const { client } = stubClient();
    const { chunks } = captureStdout();
    await runCommand(
      messagesListCommand,
      {},
      { json: true },
      { client },
    );
    const out = chunks.join("");
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out)).toMatchObject({ data: [], nextCursor: null });
  });

  it("throws a ZodError for missing required input", async () => {
    const { client } = stubClient();
    await expect(
      runCommand(templatesGetCommand, {}, { json: false }, { client }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("describeField", () => {
  const shape = sendCommand.schema.shape;

  it("marks required vs optional", () => {
    expect(describeField(shape.template).optional).toBe(false);
    expect(describeField(shape.data).optional).toBe(true);
  });

  it("detects kinds", () => {
    expect(describeField(shape.template).kind).toBe("string");
    expect(describeField(shape.data).kind).toBe("json");
    expect(describeField(shape.version).kind).toBe("number");
    const channel = describeField(shape.channel);
    expect(channel.kind).toBe("enum");
    expect(channel.enumValues).toEqual(["email", "sms", "push"]);
  });

  it("carries descriptions through wrappers", () => {
    expect(describeField(shape.data).description).toMatch(/JSON object/);
  });
});
