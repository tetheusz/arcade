import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCachedLeaderboard } from "@/lib/cached-queries";

export const revalidate = 60;

export default async function RankingPage() {
  const [daily, weekly, allTime] = await Promise.all([
    getCachedLeaderboard("daily"),
    getCachedLeaderboard("weekly"),
    getCachedLeaderboard("all"),
  ]);

  const sections = [
    { title: "Hoje", entries: daily, metric: "pts hoje" },
    { title: "Semana", entries: weekly, metric: "pts na semana" },
    { title: "Global", entries: allTime, metric: "pts totais" },
  ];

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Ranking</p>
            <h1>Ranking público do Arcade</h1>
            <p className="muted">
              Veja quem está acumulando participação diária, pontos e sinais de
              consistência dentro do Arcade.
            </p>
          </div>

          <div className="app-hero__side">
            <article className="player-card player-card--compact">
              <p className="panel-label">Como ler</p>
              <div className="feature-list">
                <div className="feature-item">
                  <strong>Hoje</strong>
                  <p>Pontuação no ciclo diário atual.</p>
                </div>
                <div className="feature-item">
                  <strong>Semana</strong>
                  <p>Pontuação acumulada nos últimos dias.</p>
                </div>
                <div className="feature-item">
                  <strong>Global</strong>
                  <p>Histórico total da plataforma.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="leaderboard-columns">
          {sections.map((section) => (
            <article key={section.title} className="leaderboard-panel">
              <div className="panel-header">
                <h2>{section.title === "Global" ? "Histórico" : section.title}</h2>
              </div>

              <div className="leaderboard-list">
                {section.entries.length > 0 ? (
                  section.entries.map((entry, index) => (
                    <div key={`${section.title}-${entry.userId}`} className="leaderboard-row">
                      <div className="leaderboard-row__rank">#{index + 1}</div>
                      <div className="leaderboard-row__copy">
                        <strong>
                          <Link className="text-link" href={`/players/${entry.slug}`}>
                            {entry.displayName}
                          </Link>
                        </strong>
                        <span>
                          {section.title === "Global"
                            ? `${entry.totalPoints} ${section.metric}`
                            : `${entry.pointsInPeriod} ${section.metric}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>Ninguém pontuou nesta janela ainda.</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
