import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCachedPublishedMissions } from "@/lib/cached-queries";
import { ARCHETYPES, type ArchetypeClass } from "@/lib/archetypes";

export const revalidate = 60;

function formatEscrow(status: string) {
  const labels: Record<string, string> = {
    NONE: "Sem escrow",
    OPEN: "Aberta",
    FUNDED: "Funded",
    SUBMITTED: "Submetida",
    COMPLETED: "Paga",
    CANCELLED: "Cancelada",
  };
  return labels[status] ?? status;
}

export default async function BountiesPage() {
  const missions = await getCachedPublishedMissions();

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Bounties</p>
            <h1>Missões para builders na Arc.</h1>
            <p className="muted">
              Complete tarefas, ganhe reputação e USDC na Arc Testnet. Qualificação
              baseada na sua atividade no Arcade.
            </p>
          </div>
          <div className="app-hero__side">
            <Link className="button primary" href="/dashboard">
              Minhas entregas
            </Link>
            <Link className="button secondary" href="/protocols">
              Protocolos
            </Link>
          </div>
        </section>

        <section className="bounty-grid">
          {missions.length > 0 ? (
            missions.map((mission) => {
              const archetype = ARCHETYPES[mission.category as ArchetypeClass];
              return (
                <article key={mission.id} className="section-card bounty-card">
                  <div className="bounty-card__header">
                    <span className="kind-pill" style={{ borderColor: archetype?.color }}>
                      {archetype?.label ?? mission.category}
                    </span>
                    {mission.rewardUsdc ? (
                      <span className="bounty-reward">{mission.rewardUsdc} USDC</span>
                    ) : (
                      <span className="bounty-reward">+{mission.reputationReward} XP</span>
                    )}
                  </div>
                  <h2>
                    <Link href={`/bounties/${mission.id}`}>{mission.title}</Link>
                  </h2>
                  <p className="muted">{mission.description.slice(0, 160)}…</p>
                  <div className="bounty-meta">
                    <span>{mission.protocol.name}</span>
                    <span>{mission.difficulty}</span>
                    <span>{formatEscrow(mission.escrowStatus)}</span>
                    <span>{mission._count.submissions} entregas</span>
                  </div>
                  <Link className="button secondary" href={`/bounties/${mission.id}`}>
                    Ver missão
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="empty-state section-card">
              <p>Nenhuma bounty publicada ainda. Volte em breve.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
