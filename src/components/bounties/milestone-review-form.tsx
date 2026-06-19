"use client";

import { useTransition } from "react";
import { reviewMilestoneClaimAction } from "@/actions/bounties";

type MilestoneReviewFormProps = {
  claimId: string;
};

export function MilestoneReviewForm({ claimId }: MilestoneReviewFormProps) {
  const [pending, startTransition] = useTransition();

  function handleReview(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewMilestoneClaimAction(claimId, status);

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <div className="form-actions">
      <button
        className="button primary"
        type="button"
        disabled={pending}
        onClick={() => handleReview("APPROVED")}
      >
        Aprovar marco
      </button>
      <button
        className="button secondary"
        type="button"
        disabled={pending}
        onClick={() => handleReview("REJECTED")}
      >
        Rejeitar
      </button>
    </div>
  );
}
