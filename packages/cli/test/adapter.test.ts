import { afterEach, describe, expect, it, vi } from "vitest";
import { Command as Commander } from "commander";
import { ZodError } from "zod";
import { registerCommands, runCommand } from "../src/cli/adapter";
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
      { template: "welcome", to: "u@x.com", vars: '{"name":"Jo"}' },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ vars: { name: "Jo" } });
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

  it("coerces a single --cc string into a one-element array", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", cc: "a@x.com" },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ cc: ["a@x.com"] });
  });

  it("splits a comma-separated --bcc string into an array", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", bcc: "a@x.com, b@y.com" },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ bcc: ["a@x.com", "b@y.com"] });
  });

  it("parses a JSON-array --cc string", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", cc: '["a@x.com","b@y.com"]' },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ cc: ["a@x.com", "b@y.com"] });
  });

  it("passes a real cc array through unchanged (MCP path)", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", cc: ["a@x.com", "b@y.com"] },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ cc: ["a@x.com", "b@y.com"] });
  });

  it("parses a JSON-string --attachments value into an array", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    const attachment = {
      filename: "invoice.pdf",
      contentType: "application/pdf",
      content: "Zm9v",
    };
    await runCommand(
      sendCommand,
      {
        template: "welcome",
        to: "u@x.com",
        attachments: JSON.stringify([attachment]),
      },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ attachments: [attachment] });
  });

  it("passes a real attachments array through unchanged (MCP path)", async () => {
    const { client, calls } = stubClient();
    captureStdout();
    const attachment = {
      filename: "invoice.pdf",
      contentType: "application/pdf",
      content: "Zm9v",
    };
    await runCommand(
      sendCommand,
      { template: "welcome", to: "u@x.com", attachments: [attachment] },
      { json: false },
      { client },
    );
    expect(calls.send).toMatchObject({ attachments: [attachment] });
  });
});

describe("describeField", () => {
  const shape = sendCommand.schema.shape;

  it("marks required vs optional", () => {
    expect(describeField(shape.template).optional).toBe(false);
    expect(describeField(shape.vars).optional).toBe(true);
  });

  it("detects kinds", () => {
    expect(describeField(shape.template).kind).toBe("string");
    expect(describeField(shape.vars).kind).toBe("json");
    expect(describeField(shape.version).kind).toBe("number");
    const channel = describeField(shape.channel);
    expect(channel.kind).toBe("enum");
    expect(channel.enumValues).toEqual(["email", "sms", "push", "web-push"]);
  });

  it("carries descriptions through wrappers", () => {
    expect(describeField(shape.vars).description).toMatch(/JSON object/);
  });
});

describe("flagHelp overrides", () => {
  it("send --cc/--bcc document CLI input conventions, not the MCP wire shape", () => {
    const program = new Commander();
    registerCommands(program, [sendCommand]);
    const leaf = program.commands.find((c) => c.name() === "send")!;
    for (const long of ["--cc", "--bcc"]) {
      const option = leaf.options.find((o) => o.long === long)!;
      expect(option.description, long).toMatch(/comma-separated or a JSON array/);
      expect(option.description, long).not.toMatch(/JSON array of addresses/);
    }
  });

  it("flags without an override keep the shared schema description", () => {
    const program = new Commander();
    registerCommands(program, [sendCommand]);
    const leaf = program.commands.find((c) => c.name() === "send")!;
    const replyTo = leaf.options.find((o) => o.long === "--reply-to")!;
    expect(replyTo.description).toBe("Email-only. Reply-To address.");
  });
});
