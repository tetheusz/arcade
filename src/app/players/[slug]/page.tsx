import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ProfileBuilderHeader } from "@/components/profile/profile-builder-header";
import { getPublicPlayerPageData } from "@/lib/player-profile";
import { formatActivityType, formatDateKey } from "@/lib/utils";

type PublicPlayerPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export default async function PublicPlayerPage({ params }: PublicPlayerPageProps) {
  const { slug } = await params;
  const data = await getPublicPlayerPageData(slug);

  if (!data) {
    notFound();
  }

  const { profile, activity, badges, approvedBounties, siweWallet, meta } = data;

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <ProfileBuilderHeader
          profile={{
            slug: profile.slug,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            skills: profile.skills,
            region: profile.region,
            links: profile.links,
            walletAddress: siweWallet?.address ?? meta?.walletAddress,
            archetype: meta?.chosenArchetype ?? null,
            xp: meta?.xp ?? profile.reputationScore,
            isOwner: false,
          }}
          stats={{
            reputation: profile.reputationScore,
            totalPoints: profile.totalPoints,
            currentStreak: profile.currentStreak,
            bounties: approvedBounties,
          }}
        />

        <section className="profile-layout">
          <div className="profile-layout__main">
            {badges.length > 0 ? (
              <article className="section-card">
                <div className="section-heading section-heading--stacked">
                  <p className="eyebrow">Conquistas</p>
                  <h2>Badges</h2>
                </div>
                <div className="badge-grid">
                  {badges.map((userBadge) => (
                    <span key={userBadge.id} className="kind-pill">
                      {userBadge.badge.icon} {userBadge.badge.name}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}

            <article className="section-card">
              <div className="section-heading section-heading--stacked">
                <p className="eyebrow">Prova de trabalho</p>
                <h2>Atividade recente</h2>
              </div>
              <div className="activity-list">
                {activity.length > 0 ? (
                  activity.map((event) => (
                    <article key={event.id} className="activity-row">
                      <strong>{formatActivityType(event.type)}</strong>
                      <span>{formatDateKey(event.dateKey)}</span>
                      <span>{event.points > 0 ? `+${event.points} pts` : "—"}</span>
                    </article>
                  ))
                ) : (
                  <p className="muted">Sem atividade pública ainda.</p>
                )}
              </div>
            </article>
          </div>

          <article className="section-card">
            <div className="section-heading section-heading--stacked">
              <p className="eyebrow">Arcade</p>
              <h2>Entrar no circuito</h2>
            </div>
            <div className="feature-list">
              <div className="feature-item">
                <Link className="text-link" href="/bounties">
                  Bounties
                </Link>
              </div>
              <div className="feature-item">
                <Link className="text-link" href="/jogar">
                  Jogar hoje
                </Link>
              </div>
              <div className="feature-item">
                <Link className="text-link" href="/ranking">
                  Ranking
                </Link>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
