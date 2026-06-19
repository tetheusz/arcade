"use client";

import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import type { SocialProviderId } from "@/lib/auth/providers";
import { socialProviderLabels } from "@/lib/auth/providers";

type SocialAuthButtonsProps = {
  redirectTo: string;
  providers: SocialProviderId[];
};

export function SocialAuthButtons({ redirectTo, providers }: SocialAuthButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (providers.length === 0) {
    return null;
  }

  function signInWith(provider: SocialProviderId) {
    setError(null);

    startTransition(async () => {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: redirectTo,
        errorCallbackURL: `/entrar?next=${encodeURIComponent(redirectTo)}&error=oauth`,
      });

      if (result.error) {
        setError(result.error.message ?? "Não foi possível iniciar o login social.");
      }
    });
  }

  return (
    <div className="auth-providers">
      <p className="auth-providers__label">Ou entre com</p>
      <div className="auth-providers__grid">
        {providers.map((provider) => (
          <button
            key={provider}
            type="button"
            className={`button secondary auth-provider auth-provider--${provider}`}
            disabled={isPending}
            onClick={() => signInWith(provider)}
          >
            {socialProviderLabels[provider].shortLabel}
          </button>
        ))}
      </div>
      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}
