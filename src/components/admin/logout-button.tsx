"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type LogoutButtonProps = {
  redirectTo?: string;
  label?: string;
};

export function LogoutButton({
  redirectTo = "/admin/login",
  label = "Sair",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button secondary"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signOut();
          router.replace(redirectTo);
          router.refresh();
        });
      }}
    >
      {isPending ? "Saindo..." : label}
    </button>
  );
}
