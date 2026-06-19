import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ReviewForm } from "@/components/bounties/review-form";
import { MilestoneReviewForm } from "@/components/bounties/milestone-review-form";
import { RetryPayoutButton } from "@/components/bounties/retry-payout-button";
import { requireAdminSession } from "@/lib/auth";
import { getPendingSubmissions } from "@/lib/bounties";
import { getPendingMilestoneClaims } from "@/lib/bounties/milestones";
import { getAdminUsdcBalance } from "@/lib/arc/usdc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdminSession();
  const [submissions, milestoneClaims, pendingPayouts, adminUsdcBalance] = await Promise.all([
    getPendingSubmissions(),
    getPendingMilestoneClaims(),
    prisma.payout.findMany({
      where: { status: "PENDING", milestoneClaimId: { not: null } },
      include: {
        user: { select: { name: true, profile: { select: { slug: true, walletAddress: true } } } },
        milestoneClaim: { include: { milestone: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getAdminUsdcBalance(),
  ]);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="app-hero">
          <h1>Revisões pendentes</h1>
          <p className="muted">Saldo USDC da carteira admin: {adminUsdcBalance} USDC</p>
          <Link className="button secondary" href="/admin/bounties">
            Voltar
          </Link>
        </section>

        {pendingPayouts.length > 0 ? (
          <section className="stack-md">
            <h2>Pagamentos USDC pendentes ({pendingPayouts.length})</h2>
            {pendingPayouts.map((payout) => (
              <article key={payout.id} className="section-card stack-sm">
                <p className="eyebrow">{payout.milestoneClaim?.milestone.title ?? "Marco"}</p>
                <p className="muted">
                  {payout.user.name} (@{payout.user.profile?.slug}) · {payout.amount} USDC
                </p>
                <p className="muted">Carteira: {payout.user.profile?.walletAddress ?? "—"}</p>
                <RetryPayoutButton payoutId={payout.id} amount={payout.amount} />
              </article>
            ))}
          </section>
        ) : null}

        {milestoneClaims.length > 0 ? (
          <section className="stack-md">
            <h2>Marcos pendentes ({milestoneClaims.length})</h2>
            {milestoneClaims.map((claim) => (
              <article key={claim.id} className="section-card stack-sm">
                <p className="eyebrow">{claim.milestone.mission.protocol.name}</p>
                <h3>{claim.milestone.mission.title}</h3>
                <p>
                  <strong>{claim.milestone.title}</strong>
                </p>
                <p className="muted">
                  {claim.user.name} (@{claim.user.profile?.slug})
                </p>
                <p>{claim.evidence}</p>
                <p className="muted">
                  Recompensa: +{claim.milestone.reputationReward} XP
                  {claim.milestone.rewardUsdc ? ` · ${claim.milestone.rewardUsdc} USDC` : ""}
                </p>
                <MilestoneReviewForm claimId={claim.id} />
              </article>
            ))}
          </section>
        ) : null}

        {submissions.map((sub) => (
          <article key={sub.id} className="section-card">
            <h2>{sub.mission.title}</h2>
            <p className="muted">
              {sub.user.name} (@{sub.user.profile?.slug})
            </p>
            <p><strong>{sub.title}</strong></p>
            <p>{sub.evidence}</p>
            {sub.links && <p className="muted">{sub.links}</p>}
            <ReviewForm
              submissionId={sub.id}
              defaultReward={sub.mission.reputationReward}
            />
          </article>
        ))}

        {submissions.length === 0 && milestoneClaims.length === 0 && (
          <div className="empty-state section-card">
            <p>Nenhuma submissão ou marco pendente.</p>
          </div>
        )}
      </main>
    </div>
  );
}
