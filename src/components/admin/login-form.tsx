"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          const result = await authClient.signIn.email({
            email,
            password,
          });

          if (result.error) {
            setError(result.error.message ?? "Não foi possível entrar.");
            return;
          }

          router.replace("/admin");
          router.refresh();
        });
      }}
    >
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          required
          placeholder="voce@exemplo.com"
          autoComplete="username"
        />
      </label>

      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="current-password"
        />
      </label>

      {error ? <p className="error-banner">{error}</p> : null}

      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
