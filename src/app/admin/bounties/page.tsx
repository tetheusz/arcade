import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBountiesPage() {
  await requireAdminSession();

  const [missions, pendingCount] = await Promise.all([
    prisma.mission.findMany({
      include: {
        protocol: { select: { name: true } },
        _count: { select: { submissions: true, milestones: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.submission.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="app-hero">
          <h1>Admin — Bounties</h1>
          <div className="header-actions">
            <Link className="button primary" href="/admin/bounties/new">
              Nova bounty
            </Link>
            <Link className="button secondary" href="/admin/bounties/reviews">
              Revisões ({pendingCount})
            </Link>
            <Link className="button secondary" href="/admin/protocols">
              Protocolos
            </Link>
            <Link className="button secondary" href="/admin">
              Voltar
            </Link>
          </div>
        </section>

        <section className="activity-list">
          {missions.map((m) => (
            <article key={m.id} className="section-card">
              <div className="bounty-card__header">
                <span className="kind-pill">{m.status}</span>
                <span>{m.escrowStatus}</span>
              </div>
              <h2>{m.title}</h2>
              <p className="muted">
                {m.protocol.name} · {m._count.submissions} entregas
                {m._count.milestones > 0 ? ` · ${m._count.milestones} marcos` : ""}
              </p>
              <div className="row-actions">
                <Link className="text-link" href={`/admin/bounties/${m.id}/edit`}>
                  Editar
                </Link>
                <Link className="text-link" href={`/bounties/${m.id}`}>
                  Ver público
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
