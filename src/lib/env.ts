function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function csv(name: string): string[] {
  const value = process.env[name] ?? "";
  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  authSecret: () => required("AUTH_SECRET"),
  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  allowedEmailDomains: () => csv("ALLOWED_EMAIL_DOMAINS"),
  initialAdminEmails: () => csv("INITIAL_ADMIN_EMAILS"),
  defaultTimezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata",
  smsProvider: process.env.SMS_PROVIDER || "dev",
};

export function isAllowedDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return env.allowedEmailDomains().includes(domain);
}

export function isBootstrapAdminEmail(email: string): boolean {
  return env.initialAdminEmails().includes(email.toLowerCase());
}
