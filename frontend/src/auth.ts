import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

loadEnvConfig(path.join(process.cwd(), ".."));

function getRequiredEnv(
  name: "AUTH_GOOGLE_ID" | "AUTH_GOOGLE_SECRET" | "AUTH_ALLOWED_EMAIL_DOMAINS",
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const allowedEmailDomains = getRequiredEnv("AUTH_ALLOWED_EMAIL_DOMAINS")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

if (allowedEmailDomains.length === 0) {
  throw new Error("AUTH_ALLOWED_EMAIL_DOMAINS must contain at least one domain");
}

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: getRequiredEnv("AUTH_GOOGLE_ID"),
      clientSecret: getRequiredEnv("AUTH_GOOGLE_SECRET"),
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      return allowedEmailDomains.some((domain) => email.endsWith(`@${domain}`));
    },
  },
  pages: {
    signIn: "/login",
  },
};
