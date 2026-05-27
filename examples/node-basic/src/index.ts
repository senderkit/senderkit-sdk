import { SenderKit, SenderKitError } from "@senderkit/sdk";

const apiKey = process.env["SENDERKIT_API_KEY"];
if (!apiKey) {
  console.error("Set SENDERKIT_API_KEY in your environment (sk_test_… or sk_live_…).");
  process.exit(1);
}

const senderkit = new SenderKit({
  apiKey,
  ...(process.env["SENDERKIT_BASE_URL"] ? { baseUrl: process.env["SENDERKIT_BASE_URL"] } : {}),
});

const to = process.env["TO"] ?? "user@example.com";

try {
  if (process.env["RAW"]) {
    // Raw send: skip the template registry and pass inline content directly.
    const result = await senderkit.sendRaw({
      channel: "email",
      to,
      content: {
        subject: "One-off message from senderkit",
        html: `<p>Hello <strong>${process.env["NAME"] ?? "Anton"}</strong>!</p>`,
        text: `Hello ${process.env["NAME"] ?? "Anton"}!`,
      },
      metadata: { source: "node-basic-example" },
      idempotencyKey: `raw:${to}`,
    });
    console.log("queued raw", result);
  } else {
    const result = await senderkit.send({
      template: "welcome",
      to,
      data: { name: process.env["NAME"] ?? "Anton" },
      idempotencyKey: `welcome:${to}`,
    });
    console.log("queued", result);
  }
} catch (err) {
  if (err instanceof SenderKitError) {
    console.error(`[${err.name}]`, err.message);
  } else {
    throw err;
  }
  process.exit(1);
}
