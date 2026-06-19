import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveProtocolApplicationAction, createProtocolAction } from "@/actions/protocols";

export const dynamic = "force-dynamic";

export default async function AdminProtocolsPage() {
  await requireAdminSession();

  const [protocols, applications] = await Promise.all([
    prisma.protocol.findMany({ orderBy: { name: "asc" } }),
    prisma.protocolApplication.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="app-hero">
          <h1>Admin — Protocolos</h1>
          <Link className="button secondary" href="/admin/bounties">
            Bounties
          </Link>
        </section>

        <section className="section-card" style={{ maxWidth: 640 }}>
          <h2>Criar protocolo</h2>
          <form
            className="stack-md"
            action={async (formData) => {
              "use server";
              await createProtocolAction({
                name: String(formData.get("name")),
                description: String(formData.get("description")),
                website: String(formData.get("website") || ""),
              });
              redirect("/admin/protocols");
            }}
          >
            <label className="field">
              <span>Nome</span>
              <input name="name" required />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea name="description" required rows={3} />
            </label>
            <label className="field">
              <span>Website</span>
              <input name="website" type="url" />
            </label>
            <button className="button primary" type="submit">
              Criar
            </button>
          </form>
        </section>

        <section>
          <h2>Candidaturas pendentes</h2>
          {applications.map((app) => (
            <article key={app.id} className="section-card">
              <h3>{app.name}</h3>
              <p className="muted">{app.user.name} — {app.description}</p>
              <form
                action={async () => {
                  "use server";
                  await approveProtocolApplicationAction(app.id);
                  redirect("/admin/protocols");
                }}
              >
                <button className="button primary" type="submit">
                  Aprovar
                </button>
              </form>
            </article>
          ))}
        </section>

        <section>
          <h2>Protocolos ({protocols.length})</h2>
          {protocols.map((p) => (
            <article key={p.id} className="section-card">
              <h3>{p.name}</h3>
              <div className="row-actions">
                <Link className="text-link" href={`/admin/protocols/${p.id}/edit`}>
                  Editar
                </Link>
                <Link className="text-link" href={`/protocols/${p.slug}`}>
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
