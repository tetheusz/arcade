import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getUserSubmissionsForDashboard } from "@/lib/bounties";
import { ARCHETYPES, type ArchetypeClass } from "@/lib/archetypes";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/entrar?next=%2Fdashboard");

  const submissions = await getUserSubmissionsForDashboard(session.user.id);

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Dashboard</p>
            <h1>Suas entregas</h1>
            <p className="muted">Acompanhe o status das suas bounties.</p>
          </div>
          <Link className="button primary" href="/bounties">
            Ver bounties
          </Link>
        </section>

        <section className="activity-list">
          {submissions.length > 0 ? (
            submissions.map((sub) => {
              const archetype = ARCHETYPES[sub.mission.category as ArchetypeClass];
              return (
                <article key={sub.id} className="section-card">
                  <div className="bounty-card__header">
                    <span className="kind-pill" style={{ borderColor: archetype?.color }}>
                      {sub.status}
                    </span>
                    {sub.rewardGranted ? <span>+{sub.rewardGranted} XP</span> : null}
                  </div>
                  <h2>{sub.mission.title}</h2>
                  <p className="muted">{sub.mission.protocol.name}</p>
                  {sub.review?.feedback && <p>{sub.review.feedback}</p>}
                  <Link className="text-link" href={`/bounties/${sub.missionId}`}>
                    Ver missão
                  </Link>
                </article>
              );
            })
          ) : (
            <article className="section-card section-card--empty">
              <p>Você ainda não submeteu nenhuma entrega.</p>
              <Link className="button primary" href="/bounties">
                Explorar bounties
              </Link>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
