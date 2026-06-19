import Link from "next/link";
import { HubHeroSceneLazy } from "@/components/home/hub-hero-scene-lazy";
import { HubPortals } from "@/components/home/hub-portals";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getHomeStats } from "@/lib/home-stats";
import { getHomeFeaturedTeaser } from "@/lib/posts";
import "./home.css";

export const revalidate = 60;

export default async function Home() {
  const [session, stats, featuredTeaser] = await Promise.all([
    getSession(),
    getHomeStats(),
    getHomeFeaturedTeaser().catch(() => null),
  ]);

  const playHref = session ? "/jogar" : "/entrar?next=%2Fjogar";

  return (
    <div className="shell shell--hub">
      <SiteHeader />

      <main className="hub-main">
        <section className="hub-hero">
          <HubHeroSceneLazy />

          <div className="hub-hero__content">
            <div className="hub-hero__copy">
              <p className="eyebrow">Arcade · Arc Testnet</p>
              <h1>O hub brasileiro para builders Arc.</h1>
              <p>
                Leitura, bounties em USDC e prova diária de skill — tudo num
                só lugar, com carteiras Circle e identidade on-chain.
              </p>
              <div className="hub-hero__actions">
                <Link className="button primary" href={playHref}>
                  Jogar hoje
                </Link>
                <Link className="button secondary" href="/bounties">
                  Ver bounties
                </Link>
              </div>
            </div>

            <div className="hub-hero__metrics" aria-label="Números do hub">
              <article className="hub-metric">
                <strong>{stats.bounties}</strong>
                <span>bounties ativas</span>
              </article>
              <article className="hub-metric">
                <strong>{stats.players}</strong>
                <span>builders</span>
              </article>
              <article className="hub-metric">
                <strong>{stats.posts}</strong>
                <span>leituras no journal</span>
              </article>
              <article className="hub-metric">
                <strong>{stats.protocols}</strong>
                <span>protocolos</span>
              </article>
            </div>
          </div>
        </section>

        <HubPortals playHref={playHref} />

        <section className="hub-flow" aria-labelledby="hub-flow-title">
          <div className="hub-flow__inner">
            <article className="hub-flow__step">
              <strong>01</strong>
              <h3 id="hub-flow-title">Leia o contexto</h3>
              <p>
                Traduções e artigos em português para entrar no ecossistema com
                clareza.
              </p>
            </article>
            <article className="hub-flow__step">
              <strong>02</strong>
              <h3>Entregue bounties</h3>
              <p>
                Missões reais de protocolos, revisão humana e pagamento via
                escrow na testnet.
              </p>
            </article>
            <article className="hub-flow__step">
              <strong>03</strong>
              <h3>Construa reputação</h3>
              <p>
                Streak diário, ranking, badges e snapshots que viram prova de
                atividade.
              </p>
            </article>
          </div>
        </section>

        {featuredTeaser ? (
          <section className="hub-teaser" aria-label="Destaque editorial">
            <Link href={`/posts/${featuredTeaser.slug}`} className="hub-teaser__link">
              <span className="hub-teaser__label">Em destaque no Journal</span>
              <span className="hub-teaser__title">{featuredTeaser.title}</span>
              <span className="text-link">Ler →</span>
            </Link>
          </section>
        ) : null}

        <section className="hub-cta">
          <div>
            <p className="eyebrow">Comece agora</p>
            <h2>Entre, jogue e construa sua trilha on-chain.</h2>
            <p>
              Conta única com Better Auth, carteira Circle no perfil e acesso a
              bounties, ranking e journal.
            </p>
          </div>
          <div className="hub-cta__actions">
            {session ? (
              <>
                <Link className="button primary" href="/dashboard">
                  Meu dashboard
                </Link>
                <Link className="button secondary" href="/perfil">
                  Perfil
                </Link>
              </>
            ) : (
              <>
                <Link className="button primary" href="/cadastro">
                  Criar conta
                </Link>
                <Link className="button secondary" href="/entrar">
                  Entrar
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
