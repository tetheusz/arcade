import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { MissionMilestonesEditor } from "@/components/bounties/mission-milestones-editor";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteMissionAction, updateMissionAction } from "@/actions/bounties";
import { parseMilestonesJson } from "@/lib/bounties/milestones";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminEditBountyPage({ params, searchParams }: Props) {
  await requireAdminSession();
  const { id } = await params;
  const { error } = await searchParams;

  const [mission, protocols] = await Promise.all([
    prisma.mission.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.protocol.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!mission) {
    notFound();
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="section-card" style={{ maxWidth: 720 }}>
          <div className="section-heading">
            <p className="eyebrow">Editar bounty</p>
            <h1>{mission.title}</h1>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <form
            className="stack-md"
            action={async (formData) => {
              "use server";
              const milestones = parseMilestonesJson(String(formData.get("milestonesJson") ?? ""));
              const result = await updateMissionAction(id, {
                title: String(formData.get("title")),
                description: String(formData.get("description")),
                requirements: String(formData.get("requirements")),
                category: String(formData.get("category")) as never,
                difficulty: String(formData.get("difficulty")) as never,
                reputationReward: milestones.length
                  ? milestones.reduce((sum, entry) => sum + entry.reputationReward, 0)
                  : Number(formData.get("reputationReward")),
                rewardUsdc: milestones.length
                  ? undefined
                  : String(formData.get("rewardUsdc") || "") || undefined,
                minReputation: Number(formData.get("minReputation") || 0),
                minStreak: Number(formData.get("minStreak") || 0),
                protocolId: String(formData.get("protocolId")),
                status: String(formData.get("status")) as never,
                milestones,
              });

              if (result.success) {
                redirect("/admin/bounties");
              }

              redirect(
                `/admin/bounties/${id}/edit?error=${encodeURIComponent(result.error ?? "Falha ao salvar.")}`,
              );
            }}
          >
            <label className="field">
              <span>Título</span>
              <input name="title" required defaultValue={mission.title} />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea name="description" required rows={3} defaultValue={mission.description} />
            </label>
            <label className="field">
              <span>Requisitos</span>
              <textarea name="requirements" required rows={3} defaultValue={mission.requirements} />
            </label>
            <label className="field">
              <span>Protocolo</span>
              <select name="protocolId" required defaultValue={mission.protocolId}>
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" required defaultValue={mission.status}>
                <option value="PUBLISHED">Publicada</option>
                <option value="DRAFT">Rascunho</option>
                <option value="ARCHIVED">Arquivada</option>
              </select>
            </label>
            <label className="field">
              <span>Arquétipo</span>
              <select name="category" required defaultValue={mission.category}>
                <option value="DEVELOPER">Developer</option>
                <option value="SENTINEL">Sentinel</option>
                <option value="CREATOR">Creator</option>
                <option value="SCHOLAR">Scholar</option>
                <option value="ARCHITECT">Architect</option>
              </select>
            </label>
            <label className="field">
              <span>Dificuldade</span>
              <select name="difficulty" required defaultValue={mission.difficulty}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </label>
            <div className="form-row">
              <label className="field">
                <span>XP</span>
                <input
                  name="reputationReward"
                  type="number"
                  defaultValue={mission.reputationReward}
                />
              </label>
              <label className="field">
                <span>USDC (opcional)</span>
                <input name="rewardUsdc" defaultValue={mission.rewardUsdc ?? ""} placeholder="1.0" />
              </label>
              <label className="field">
                <span>Rep. mínima</span>
                <input
                  name="minReputation"
                  type="number"
                  defaultValue={mission.minReputation}
                />
              </label>
              <label className="field">
                <span>Streak mínimo</span>
                <input name="minStreak" type="number" defaultValue={mission.minStreak} />
              </label>
            </div>

            <MissionMilestonesEditor
              initialMilestones={mission.milestones.map((milestone) => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description ?? "",
                reputationReward: milestone.reputationReward,
                rewardUsdc: milestone.rewardUsdc ?? "",
              }))}
            />

            {mission.erc8183JobId ? (
              <p className="muted">
                Escrow on-chain: job #{mission.erc8183JobId} · {mission.escrowStatus}
              </p>
            ) : (
              <p className="muted">
                Escrow on-chain será tentado automaticamente quando houver USDC nos marcos e{" "}
                <code>ADMIN_PRIVATE_KEY</code> configurada.
              </p>
            )}

            <div className="form-actions">
              <button className="button primary" type="submit">
                Salvar alterações
              </button>
              <Link className="button secondary" href="/admin/bounties">
                Cancelar
              </Link>
            </div>
          </form>

          <form
            className="stack-sm"
            style={{ marginTop: "2rem" }}
            action={async () => {
              "use server";
              const result = await deleteMissionAction(id);

              if (result.success) {
                redirect("/admin/bounties");
              }

              redirect(
                `/admin/bounties/${id}/edit?error=${encodeURIComponent(result.error ?? "Falha ao excluir.")}`,
              );
            }}
          >
            <p className="panel-label">Zona de risco</p>
            <button className="text-button danger" type="submit">
              Excluir bounty permanentemente
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
