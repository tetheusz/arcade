import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BountySubmitForm } from "@/components/bounties/bounty-submit-form";
import { MilestoneProgressPanel } from "@/components/bounties/milestone-progress-panel";
import { getSession } from "@/lib/auth";
import {
  getMissionByIdForPage,
  getUserMilestoneClaimsForMission,
  canUserApplyToMission,
} from "@/lib/bounties";
import { ARCHETYPES, type ArchetypeClass } from "@/lib/archetypes";
import { explorerTxUrl } from "@/lib/arc/chain";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BountyDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const [mission, canApply, userClaims] = await Promise.all([
    getMissionByIdForPage(id),
    session
      ? canUserApplyToMission(session.user.id, id)
      : Promise.resolve(null),
    session ? getUserMilestoneClaimsForMission(id, session.user.id) : Promise.resolve([]),
  ]);

  if (!mission || mission.status !== "PUBLISHED") {
    notFound();
  }

  const archetype = ARCHETYPES[mission.category as ArchetypeClass];
  const totalXp = mission.milestones.length
    ? mission.milestones.reduce((sum, entry) => sum + entry.reputationReward, 0)
    : mission.reputationReward;
  const totalUsdc = mission.rewardUsdc;

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">{mission.protocol.name}</p>
            <h1>{mission.title}</h1>
            <p className="muted">{mission.description}</p>
          </div>
          <div className="app-hero__side">
            <article className="player-card player-card--compact">
              <p className="panel-label">Recompensa total</p>
              {totalUsdc ? (
                <h2>{totalUsdc} USDC</h2>
              ) : (
                <h2>+{totalXp} XP</h2>
              )}
              {mission.milestones.length > 0 ? (
                <p className="muted">
                  {mission.milestones.length} marcos · até {totalXp} XP
                  {totalUsdc ? ` · ${totalUsdc} USDC` : ""}
                </p>
              ) : null}
              <p className="muted">Escrow: {mission.escrowStatus}</p>
            </article>
          </div>
        </section>

        <section className="product-sections">
          <article className="section-card">
            <h2>Requisitos</h2>
            <p>{mission.requirements}</p>
            <div className="bounty-meta">
              <span style={{ color: archetype?.color }}>{archetype?.label}</span>
              <span>{mission.difficulty}</span>
              {mission.minReputation > 0 && (
                <span>Rep. mín: {mission.minReputation}</span>
              )}
              {mission.minStreak > 0 && <span>Streak mín: {mission.minStreak}</span>}
            </div>
          </article>

          <MilestoneProgressPanel
            missionId={mission.id}
            milestones={mission.milestones}
            userClaims={userClaims}
            isLoggedIn={Boolean(session)}
          />

          {session && canApply?.allowed ? (
            <article className="section-card">
              <h2>Submeter entrega</h2>
              <BountySubmitForm missionId={mission.id} />
            </article>
          ) : session && canApply && !canApply.allowed ? (
            <article className="section-card">
              <p className="muted">{canApply.reason}</p>
            </article>
          ) : (
            <article className="section-card">
              <p className="muted">
                <Link className="text-link" href="/entrar">
                  Entre
                </Link>{" "}
                para submeter uma entrega.
              </p>
            </article>
          )}

          {mission.payouts.length > 0 && (
            <article className="section-card">
              <h2>Pagamentos</h2>
              {mission.payouts.map((p) => (
                <div key={p.id} className="activity-row">
                  <span>{p.amount} USDC</span>
                  <span>{p.status}</span>
                  {p.txHash && (
                    <a className="text-link" href={explorerTxUrl(p.txHash)} target="_blank" rel="noopener noreferrer">
                      Ver tx
                    </a>
                  )}
                </div>
              ))}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
