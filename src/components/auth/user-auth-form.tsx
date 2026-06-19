"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { AuthProviderConfig } from "@/lib/auth/providers";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

const WalletAuthButton = dynamic(
  () =>
    import("@/components/auth/wallet-auth-button").then((mod) => mod.WalletAuthButton),
  { ssr: false },
);

type UserAuthFormProps = {
  mode: "sign-in" | "sign-up";
  redirectTo?: string;
  providers?: AuthProviderConfig;
  oauthError?: boolean;
};

export function UserAuthForm({
  mode,
  redirectTo = "/jogar",
  providers = { social: [], wallet: true },
  oauthError = false,
}: UserAuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    oauthError ? "Login social cancelado ou falhou. Tente novamente." : null,
  );
  const isSignUp = mode === "sign-up";
  const hasAltAuth = providers.social.length > 0 || providers.wallet;

  return (
    <div className="auth-form-stack">
      {hasAltAuth ? (
        <>
          <WalletAuthButton redirectTo={redirectTo} enabled={providers.wallet} />
          <SocialAuthButtons redirectTo={redirectTo} providers={providers.social} />
          <div className="auth-divider" role="separator">
            <span>ou use email e senha</span>
          </div>
        </>
      ) : null}

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);

          const formData = new FormData(event.currentTarget);
          const name = String(formData.get("name") ?? "").trim();
          const email = String(formData.get("email") ?? "").trim();
          const password = String(formData.get("password") ?? "");

          startTransition(async () => {
            const result = isSignUp
              ? await authClient.signUp.email({
                  name,
                  email,
                  password,
                })
              : await authClient.signIn.email({
                  email,
                  password,
                });

            if (result.error) {
              setError(result.error.message ?? "Não foi possível autenticar.");
              return;
            }

            router.replace(redirectTo);
            router.refresh();
          });
        }}
      >
        {isSignUp ? (
          <label className="field">
            <span>Nome</span>
            <input type="text" name="name" minLength={3} autoComplete="name" required />
          </label>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input type="email" name="email" autoComplete="email" required />
        </label>

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            name="password"
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
          />
        </label>

        {error ? <p className="error-banner">{error}</p> : null}

        <button className="button primary" type="submit" disabled={isPending}>
          {isPending
            ? isSignUp
              ? "Criando conta..."
              : "Entrando..."
            : isSignUp
              ? "Criar conta"
              : "Entrar"}
        </button>

        <p className="muted auth-switch">
          {isSignUp ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <Link
            className="text-link"
            href={
              isSignUp
                ? `/entrar?next=${encodeURIComponent(redirectTo)}`
                : `/cadastro?next=${encodeURIComponent(redirectTo)}`
            }
          >
            {isSignUp ? "Entrar" : "Criar agora"}
          </Link>
        </p>
      </form>
    </div>
  );
}
