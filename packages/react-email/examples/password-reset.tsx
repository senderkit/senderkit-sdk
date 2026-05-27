import { defineTemplate } from "@senderkit/react-email";

export interface PasswordResetProps {
  resetUrl: string;
  expiresInMinutes: number;
}

function PasswordResetEmail({ resetUrl, expiresInMinutes }: PasswordResetProps) {
  return (
    <div>
      <h1>Reset your password</h1>
      <p>
        Click the link below to reset your password. This link expires in {expiresInMinutes}{" "}
        minutes.
      </p>
      <a href={resetUrl}>Reset password</a>
      <p>If you didn&apos;t request this, you can safely ignore this email.</p>
    </div>
  );
}

export default defineTemplate({
  id: "password-reset",
  name: "Password Reset",
  description: "Sent when a user requests a password reset link.",
  subject: "Reset your password",
  previewText: "Use this link to reset your password",
  previewData: {
    resetUrl: "https://example.com/reset?token=preview",
    expiresInMinutes: 15,
  },
  tags: ["auth", "security"],
  version: "1.0.0",
  component: PasswordResetEmail,
});
