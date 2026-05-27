import { defineTemplate } from "@senderkit/react-email";

export interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <div>
      <h1>Welcome, {name}</h1>
      <p>Thanks for signing up. Click the link below to log in for the first time.</p>
      <a href={loginUrl}>Log in</a>
    </div>
  );
}

export default defineTemplate({
  id: "welcome-email",
  name: "Welcome Email",
  description: "Sent when a user signs up.",
  subject: ({ name }) => `Welcome, ${name}!`,
  previewText: "Get started in 60 seconds",
  previewData: {
    name: "John",
    loginUrl: "https://example.com/login",
  },
  tags: ["auth", "onboarding"],
  locale: "en-US",
  version: "1.0.0",
  component: WelcomeEmail,
});
