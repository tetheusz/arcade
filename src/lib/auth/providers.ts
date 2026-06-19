export type SocialProviderId = "google" | "github" | "twitter";

export type AuthProviderConfig = {
  social: SocialProviderId[];
  wallet: boolean;
};

const socialProviderEnv: Record<SocialProviderId, { id: string; secret: string }> = {
  google: {
    id: "GOOGLE_CLIENT_ID",
    secret: "GOOGLE_CLIENT_SECRET",
  },
  github: {
    id: "GITHUB_CLIENT_ID",
    secret: "GITHUB_CLIENT_SECRET",
  },
  twitter: {
    id: "TWITTER_CLIENT_ID",
    secret: "TWITTER_CLIENT_SECRET",
  },
};

export function getEnabledSocialProviders(): SocialProviderId[] {
  return (Object.keys(socialProviderEnv) as SocialProviderId[]).filter((provider) => {
    const keys = socialProviderEnv[provider];
    return Boolean(process.env[keys.id] && process.env[keys.secret]);
  });
}

export function isWalletAuthEnabled() {
  return process.env.ENABLE_WALLET_AUTH !== "false";
}

export function getAuthProviderConfig(): AuthProviderConfig {
  return {
    social: getEnabledSocialProviders(),
    wallet: isWalletAuthEnabled(),
  };
}

export function getAuthDomain(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "localhost";
  }
}

export const socialProviderLabels: Record<
  SocialProviderId,
  { label: string; shortLabel: string }
> = {
  google: { label: "Continuar com Google", shortLabel: "Google" },
  github: { label: "Continuar com GitHub", shortLabel: "GitHub" },
  twitter: { label: "Continuar com X", shortLabel: "X" },
};
