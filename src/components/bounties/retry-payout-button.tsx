"use client";

import { useTransition } from "react";
import { retryMilestonePayoutAction } from "@/actions/bounties";

type RetryPayoutButtonProps = {
  payoutId: string;
  amount: string;
};

export function RetryPayoutButton({ payoutId, amount }: RetryPayoutButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await retryMilestonePayoutAction(payoutId);

          if (result.success) {
            window.location.reload();
          } else {
            alert(result.error);
          }
        });
      }}
    >
      {pending ? "Enviando…" : `Reenviar ${amount} USDC`}
    </button>
  );
}
