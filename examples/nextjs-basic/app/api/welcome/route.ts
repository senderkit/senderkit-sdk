import { NextResponse } from "next/server";
import { SenderKit, SenderKitError, SenderKitValidationError } from "@senderkit/sdk";

let client: SenderKit | undefined;
function senderkit(): SenderKit {
  return (client ??= new SenderKit({ apiKey: process.env.SENDERKIT_API_KEY! }));
}

interface WelcomePayload {
  email: string;
  name?: string;
}

export async function POST(req: Request) {
  let payload: WelcomePayload;
  try {
    payload = (await req.json()) as WelcomePayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!payload.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const result = await senderkit().send({
      template: "welcome",
      to: payload.email,
      vars: { name: payload.name ?? "there" },
      idempotencyKey: `welcome:${payload.email}`,
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
