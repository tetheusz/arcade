import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCachedProtocolBySlug } from "@/lib/cached-queries";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export default async function ProtocolDetailPage({ params }: Props) {
  const { slug } = await params;
  const protocol = await getCachedProtocolBySlug(slug);

  if (!protocol) notFound();

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Protocolo</p>
            <h1>{protocol.name}</h1>
            <p className="muted">{protocol.description}</p>
            {protocol.website && (
              <a className="text-link" href={protocol.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            )}
          </div>
        </section>

        <section className="bounty-grid">
          {protocol.missions.map((mission) => (
            <article key={mission.id} className="section-card">
              <h2>
                <Link href={`/bounties/${mission.id}`}>{mission.title}</Link>
              </h2>
              <p className="muted">{mission.description.slice(0, 120)}…</p>
              {mission.rewardUsdc ? (
                <span className="bounty-reward">{mission.rewardUsdc} USDC</span>
              ) : (
                <span>+{mission.reputationReward} XP</span>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
