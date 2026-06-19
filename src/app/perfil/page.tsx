import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ProfileBuilderHeader } from "@/components/profile/profile-builder-header";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ArchetypeOnboarding } from "@/components/archetypes/archetype-onboarding";
import { WalletCard } from "@/components/wallet/wallet-card";
import { ActivityClaimCard } from "@/components/onchain/activity-claim-card";
import { getSession } from "@/lib/auth";
import { getOwnerProfilePageData } from "@/lib/player-profile";
import { formatActivityType, formatDateKey } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/entrar");
  }

  const data = await getOwnerProfilePageData(session.user.id, {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  const { profile, record, activity, approvedBounties, wallet, siweWallet } = data;

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
            walletAddress: siweWallet?.address ?? record.walletAddress,
            archetype: record.chosenArchetype,
            xp: record.xp,
            isOwner: true,
          }}
          stats={{
            reputation: profile.reputationScore,
            totalPoints: profile.totalPoints,
            currentStreak: profile.currentStreak,
            bounties: approvedBounties,
          }}
        />

        <div className="profile-layout">
          <div className="profile-layout__main">
            <ProfileEditor
              initial={{
                displayName: record.displayName ?? profile.displayName,
                bio: record.bio ?? "",
                avatarUrl: record.avatarUrl ?? "",
                avatarPreviewUrl: profile.avatarUrl,
                skills: profile.skills.join(", "),
                region: record.region ?? "",
                twitter: profile.links.twitter ?? "",
                github: profile.links.github ?? "",
                website: profile.links.website ?? "",
                discord: profile.links.discord ?? "",
              }}
            />

            <article className="section-card">
              <div className="section-heading section-heading--stacked">
                <p className="eyebrow">Histórico</p>
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
                  <div className="empty-state">
                    <p>Seu histórico aparece aqui assim que você começar a jogar.</p>
                  </div>
                )}
              </div>
            </article>
          </div>

          <div className="profile-layout__main">
            <WalletCard
              walletAddress={wallet?.walletAddress ?? null}
              walletState={wallet?.walletState ?? "PENDING"}
              usdcEarned={wallet?.usdcEarned ?? "0"}
              isMock={wallet?.walletId?.startsWith("mock-") ?? false}
            />

            <ArchetypeOnboarding currentArchetype={record.chosenArchetype} />

            <ActivityClaimCard />

            <article className="section-card">
              <div className="section-heading section-heading--stacked">
                <p className="eyebrow">Conta</p>
                <h2>Próximos passos</h2>
              </div>
              <div className="feature-list">
                <div className="feature-item">
                  <strong>Bounties</strong>
                  <p>
                    <Link className="text-link" href="/bounties">
                      Ver missões disponíveis
                    </Link>
                  </p>
                </div>
                <div className="feature-item">
                  <strong>Dashboard</strong>
                  <p>
                    <Link className="text-link" href="/dashboard">
                      Minhas entregas
                    </Link>
                  </p>
                </div>
                <div className="feature-item">
                  <strong>Ranking</strong>
                  <p>
                    <Link className="text-link" href="/ranking">
                      Ver leaderboard
                    </Link>
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
