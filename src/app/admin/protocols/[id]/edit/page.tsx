import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteProtocolAction, updateProtocolAction } from "@/actions/protocols";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminEditProtocolPage({ params, searchParams }: Props) {
  await requireAdminSession();
  const { id } = await params;
  const { error } = await searchParams;

  const protocol = await prisma.protocol.findUnique({
    where: { id },
    include: { _count: { select: { missions: true } } },
  });

  if (!protocol) {
    notFound();
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="section-card" style={{ maxWidth: 640 }}>
          <div className="section-heading">
            <p className="eyebrow">Editar protocolo</p>
            <h1>{protocol.name}</h1>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <form
            className="stack-md"
            action={async (formData) => {
              "use server";
              const result = await updateProtocolAction(id, {
                name: String(formData.get("name")),
                description: String(formData.get("description")),
                website: String(formData.get("website") || ""),
                twitter: String(formData.get("twitter") || ""),
                logoUrl: String(formData.get("logoUrl") || ""),
                isVerified: formData.get("isVerified") === "on",
              });

              if (result.success) {
                redirect("/admin/protocols");
              }

              redirect(
                `/admin/protocols/${id}/edit?error=${encodeURIComponent(result.error ?? "Falha ao salvar.")}`,
              );
            }}
          >
            <label className="field">
              <span>Nome</span>
              <input name="name" required defaultValue={protocol.name} />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea name="description" required rows={3} defaultValue={protocol.description} />
            </label>
            <label className="field">
              <span>Website</span>
              <input name="website" type="url" defaultValue={protocol.website ?? ""} />
            </label>
            <label className="field">
              <span>Twitter</span>
              <input name="twitter" defaultValue={protocol.twitter ?? ""} />
            </label>
            <label className="field">
              <span>Logo URL</span>
              <input name="logoUrl" defaultValue={protocol.logoUrl ?? ""} />
            </label>
            <label className="field checkbox-field">
              <input
                name="isVerified"
                type="checkbox"
                defaultChecked={protocol.isVerified}
              />
              <span>Verificado na listagem pública</span>
            </label>

            <div className="form-actions">
              <button className="button primary" type="submit">
                Salvar alterações
              </button>
              <Link className="button secondary" href="/admin/protocols">
                Cancelar
              </Link>
            </div>
          </form>

          <form
            className="stack-sm"
            style={{ marginTop: "2rem" }}
            action={async () => {
              "use server";
              const result = await deleteProtocolAction(id);

              if (result.success) {
                redirect("/admin/protocols");
              }

              redirect(
                `/admin/protocols/${id}/edit?error=${encodeURIComponent(result.error ?? "Falha ao excluir.")}`,
              );
            }}
          >
            <p className="panel-label">Zona de risco</p>
            <p className="muted">
              Excluir também remove {protocol._count.missions} bounty(s) vinculada(s).
            </p>
            <button className="text-button danger" type="submit">
              Excluir protocolo permanentemente
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
