import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { siwe } from "better-auth/plugins";
import { verifyMessage } from "viem";
import {
  getPrimaryOrigin,
  getTrustedOrigins,
  isProductionEnvironment,
} from "@/lib/app-security";
import {
  getAuthDomain,
  getEnabledSocialProviders,
  isWalletAuthEnabled,
} from "@/lib/auth/providers";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { prisma } from "@/lib/prisma";

const baseURL = getPrimaryOrigin();
const trustedOrigins = getTrustedOrigins();
const authSecret = process.env.BETTER_AUTH_SECRET;
const authDomain = getAuthDomain(baseURL);
const databaseProvider = process.env.DATABASE_URL?.startsWith("postgres")
  ? "postgresql"
  : "sqlite";

if (isProductionEnvironment() && (!authSecret || authSecret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
    providers.twitter = {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    };
  }

  return providers;
}

const socialProviders = buildSocialProviders();
const walletAuthEnabled = isWalletAuthEnabled();

export const auth = betterAuth({
  secret: authSecret ?? "dev-only-secret-change-before-production-please-change-me",
  baseURL,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: databaseProvider,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
  },
  socialProviders,
  rateLimit: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
  },
  plugins: [
    ...(walletAuthEnabled
      ? [
          siwe({
            domain: authDomain,
            emailDomainName: authDomain,
            anonymous: true,
            getNonce: async () =>
              generateRandomString(32, "a-z", "A-Z", "0-9"),
            verifyMessage: async ({ message, signature, address }) => {
              try {
                return await verifyMessage({
                  address: address as `0x${string}`,
                  message,
                  signature: signature as `0x${string}`,
                });
              } catch {
                return false;
              }
            },
          }),
        ]
      : []),
    nextCookies(),
  ],
  advanced: {
    cookies: {
      sessionToken: {
        attributes: {
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          httpOnly: true,
        },
      },
    },
  },
});

export { getEnabledSocialProviders, isWalletAuthEnabled, ARC_TESTNET_CHAIN_ID as SIWE_CHAIN_ID };

export async function readSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/** Cached per RSC request — do not use in Route Handlers. */
export const getSession = cache(readSession);

/** Session lookup for `/api/*` route handlers (React.cache is invalid there). */
export async function getRouteSession() {
  return readSession();
}

export function isAdminSession(
  session:
    | Awaited<ReturnType<typeof getSession>>
    | {
        user?: {
          email?: string | null;
        } | null;
      }
    | null
    | undefined,
) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return false;
  }

  return session?.user?.email === adminEmail;
}

export async function isAdminAuthenticated() {
  const session = await readSession();
  return isAdminSession(session);
}

export async function getAdminSession() {
  const session = await getSession();
  return isAdminSession(session) ? session : null;
}

export async function requireUserSession() {
  const session = await getSession();

  if (!session) {
    redirect("/entrar");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await getSession();

  if (!isAdminSession(session)) {
    redirect("/admin/login");
  }

  return session;
}
