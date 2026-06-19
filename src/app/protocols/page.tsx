import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCachedProtocols } from "@/lib/cached-queries";
import { getSession } from "@/lib/auth";

export const revalidate = 300;

export default async function ProtocolsPage() {
  const [protocols, session] = await Promise.all([getCachedProtocols(), getSession()]);

  return (
    <div className="shell">
      <SiteHeader />

      <main className="stack-xl">
        <section className="app-hero">
          <div className="app-hero__copy">
            <p className="eyebrow">Protocolos</p>
            <h1>Projetos verificados no ecossistema Arc.</h1>
          </div>
          {session && (
            <Link className="button secondary" href="/protocols/apply">
              Candidatar protocolo
            </Link>
          )}
        </section>

        <section className="bounty-grid">
          {protocols.map((protocol) => (
            <article key={protocol.id} className="section-card">
              <h2>
                <Link href={`/protocols/${protocol.slug}`}>{protocol.name}</Link>
              </h2>
              <p className="muted">{protocol.description.slice(0, 140)}…</p>
              <span className="muted">{protocol._count.missions} missões</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
