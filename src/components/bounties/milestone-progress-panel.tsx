"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimMilestoneAction } from "@/actions/bounties";

type MilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  reputationReward: number;
  rewardUsdc: string | null;
};

type UserClaim = {
  milestoneId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  evidence: string;
};

type MilestoneProgressPanelProps = {
  missionId: string;
  milestones: MilestoneItem[];
  userClaims: UserClaim[];
  isLoggedIn: boolean;
};

function statusLabel(status: UserClaim["status"] | null) {
  if (status === "APPROVED") return "Concluído";
  if (status === "PENDING") return "Em revisão";
  if (status === "REJECTED") return "Rejeitado — envie de novo";
  return "Disponível";
}

function MilestoneClaimForm({ milestoneId }: { milestoneId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await claimMilestoneAction(
        milestoneId,
        String(form.get("evidence") ?? ""),
      );

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form className="stack-sm" onSubmit={handleSubmit}>
      <label className="field">
        <span>Evidência (link, print, métrica)</span>
        <input
          name="evidence"
          required
          placeholder="https://..."
        />
      </label>
      <button className="button secondary" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar para revisão"}
      </button>
    </form>
  );
}

export function MilestoneProgressPanel({
  milestones,
  userClaims,
  isLoggedIn,
}: MilestoneProgressPanelProps) {
  if (milestones.length === 0) {
    return null;
  }

  const claimsByMilestone = new Map(userClaims.map((claim) => [claim.milestoneId, claim]));

  return (
    <article className="section-card stack-md">
      <div className="section-heading">
        <h2>Progressos</h2>
        <p className="muted">Complete cada marco para liberar XP e USDC.</p>
      </div>

      <ol className="milestone-list stack-md">
        {milestones.map((milestone, index) => {
          const claim = claimsByMilestone.get(milestone.id) ?? null;
          const status = claim?.status ?? null;

          return (
            <li key={milestone.id} className="milestone-item section-card stack-sm">
              <div className="bounty-card__header">
                <span className="panel-label">Etapa {index + 1}</span>
                <span className={`kind-pill kind-pill--${status === "APPROVED" ? "published" : "draft"}`}>
                  {statusLabel(status)}
                </span>
              </div>

              <h3>{milestone.title}</h3>
              {milestone.description ? <p className="muted">{milestone.description}</p> : null}

              <p className="muted">
                Recompensa: +{milestone.reputationReward} XP
                {milestone.rewardUsdc ? ` · ${milestone.rewardUsdc} USDC` : ""}
              </p>

              {claim?.evidence && status !== "APPROVED" ? (
                <p className="muted">Evidência enviada: {claim.evidence}</p>
              ) : null}

              {isLoggedIn && (!status || status === "REJECTED") ? (
                <MilestoneClaimForm milestoneId={milestone.id} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
