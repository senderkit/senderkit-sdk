import { NextResponse } from "next/server";
import { SenderKit, SenderKitError, SenderKitValidationError } from "@senderkit/sdk";

const senderkit = new SenderKit({ apiKey: process.env.SENDERKIT_API_KEY! });

const SUPPORT_INBOX = process.env.SUPPORT_INBOX ?? "support@example.com";

interface ContactPayload {
  fromEmail: string;
  fromName?: string;
  subject: string;
  message: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let payload: ContactPayload;
  try {
    payload = (await req.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!payload.fromEmail || !payload.subject || !payload.message) {
    return NextResponse.json(
      { error: "fromEmail, subject, and message are required" },
      { status: 400 },
    );
  }

  const senderLabel = payload.fromName
    ? `${payload.fromName} <${payload.fromEmail}>`
    : payload.fromEmail;

  try {
    const result = await senderkit.sendRaw({
      channel: "email",
      to: SUPPORT_INBOX,
      content: {
        subject: `[Contact] ${payload.subject}`,
        html: `<p><strong>From:</strong> ${escapeHtml(senderLabel)}</p>
<p>${escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>`,
        text: `From: ${senderLabel}\n\n${payload.message}`,
      },
      metadata: { source: "contact-form" },
    });
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    if (err instanceof SenderKitValidationError) {
      return NextResponse.json({ error: err.message, issues: err.issues }, { status: 400 });
    }
    if (err instanceof SenderKitError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
