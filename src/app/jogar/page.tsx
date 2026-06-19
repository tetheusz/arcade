import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getOrCreatePlayerProfile, getTodayChallenges } from "@/lib/challenges";
import { formatDateKey, getDateKey } from "@/lib/utils";
import type { DailyChallengeWithProgress } from "@/types/challenge";

const DailyChallengeCard = dynamic(
  () =>
    import("@/components/challenges/daily-challenge-card").then(
      (mod) => mod.DailyChallengeCard,
    ),
  {
    loading: () => (
      <div className="page-loading__card" style={{ minHeight: 220 }} aria-hidden="true" />
    ),
  },
);

const sectionMeta = {
  word: {
    id: "termo",
    title: "Modo Termo",
    description: "Palavra do dia com tabuleiro próprio, teclado visual e leitura por letra.",
  },
  connection: {
    id: "conexo",
    title: "Modo Conexo",
    description: "Tabuleiro de associação para fechar grupos de 4 itens por categoria.",
  },
  security: {
    id: "security",
    title: "Modo Segurança",
    description: "Mini desafio técnico para revisar conceitos, padrões e leitura de contratos.",
  },
} as const;

export default async function PlayPage() {
  const session = await getSession();

  if (!session) {
    redirect("/entrar?next=%2Fjogar");
  }

  const [profile, challenges] = await Promise.all([
    getOrCreatePlayerProfile({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    }),
    getTodayChallenges(session.user.id),
  ]);

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Jogar hoje</p>
            <h1>Desafios de {formatDateKey(getDateKey())}</h1>
            <p className="muted">
              Resolva o ciclo diário do Arcade, mantenha sua streak viva e
              transforme constância em reputação visível.
            </p>
          </div>

          <div className="app-hero__side">
            <article className="player-card player-card--compact">
              <p className="panel-label">Seu painel</p>
              <h2>{profile.displayName}</h2>
              <div className="mini-stats">
                <span>{profile.totalPoints} pts</span>
                <span>{profile.currentStreak} de streak</span>
                <span>{profile.solvedChallenges} resolvidos</span>
                <span>{profile.reputationScore} reputação</span>
              </div>
            </article>

            <nav className="game-nav game-nav--pills" aria-label="Navegação dos modos">
              <a href="#termo">Termo</a>
              <a href="#conexo">Conexo</a>
              <a href="#security">Segurança</a>
            </nav>
          </div>
        </section>

        <section className="play-stages">
          <div className="section-heading section-heading--row">
            <div>
              <p className="eyebrow">Ciclo diário</p>
              <h2>Uma rodada por categoria</h2>
            </div>
            <p className="muted">
              Comece por Termo, feche Conexo e termine com a camada técnica.
            </p>
          </div>

          {challenges.map((challenge: DailyChallengeWithProgress) => {
            const meta = sectionMeta[challenge.category];

            return (
              <section key={challenge.id} id={meta.id} className="game-stage">
                <div className="section-heading">
                  <p className="eyebrow">{meta.id}</p>
                  <h2>{meta.title}</h2>
                  <p className="muted">{meta.description}</p>
                </div>

                <DailyChallengeCard challenge={challenge} isAuthenticated />
              </section>
            );
          })}
        </section>
      </main>
    </div>
  );
}
