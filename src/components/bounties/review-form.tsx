"use client";

import { useTransition } from "react";
import { reviewSubmissionAction } from "@/actions/bounties";

type ReviewFormProps = {
  submissionId: string;
  defaultReward: number;
};

export function ReviewForm({ submissionId, defaultReward }: ReviewFormProps) {
  const [pending, startTransition] = useTransition();

  function handleReview(status: "APPROVED" | "REJECTED", form: HTMLFormElement) {
    const data = new FormData(form);
    startTransition(async () => {
      const result = await reviewSubmissionAction(submissionId, {
        status,
        feedback: String(data.get("feedback") ?? ""),
        qualityScore: Number(data.get("qualityScore") ?? 5),
        impactScore: Number(data.get("impactScore") ?? 5),
        rewardGranted: status === "APPROVED" ? Number(data.get("rewardGranted") ?? defaultReward) : undefined,
      });

      if (result.success) {
        window.location.href = "/admin/bounties/reviews";
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form className="stack-md" id={`review-${submissionId}`}>
      <label className="field">
        <span>Feedback</span>
        <textarea name="feedback" rows={4} placeholder="Comentário para o builder" />
      </label>
      <div className="form-row">
        <label className="field">
          <span>Qualidade (1-10)</span>
          <input name="qualityScore" type="number" min={1} max={10} defaultValue={7} />
        </label>
        <label className="field">
          <span>Impacto (1-10)</span>
          <input name="impactScore" type="number" min={1} max={10} defaultValue={7} />
        </label>
        <label className="field">
          <span>XP concedido</span>
          <input name="rewardGranted" type="number" defaultValue={defaultReward} />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="button primary"
          type="button"
          disabled={pending}
          onClick={(e) => handleReview("APPROVED", e.currentTarget.form!)}
        >
          Aprovar
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={pending}
          onClick={(e) => handleReview("REJECTED", e.currentTarget.form!)}
        >
          Rejeitar
        </button>
      </div>
    </form>
  );
}
