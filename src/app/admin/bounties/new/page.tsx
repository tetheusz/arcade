import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { MissionMilestonesEditor } from "@/components/bounties/mission-milestones-editor";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMissionAction } from "@/actions/bounties";
import { parseMilestonesJson } from "@/lib/bounties/milestones";

export const dynamic = "force-dynamic";

export default async function AdminNewBountyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSession();
  const { error } = await searchParams;
  const protocols = await prisma.protocol.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="section-card" style={{ maxWidth: 720 }}>
          <h1>Nova bounty</h1>
          {error ? <p className="error-banner">{error}</p> : null}
          <form
            className="stack-md"
            action={async (formData) => {
              "use server";
              const milestones = parseMilestonesJson(String(formData.get("milestonesJson") ?? ""));
              const result = await createMissionAction({
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
                status: "PUBLISHED",
                milestones,
              });
              if (result.success) {
                redirect("/admin/bounties");
              }

              redirect(
                `/admin/bounties/new?error=${encodeURIComponent(result.error ?? "Falha ao criar bounty.")}`,
              );
            }}
          >
            <label className="field">
              <span>Título</span>
              <input name="title" required />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea name="description" required rows={3} />
            </label>
            <label className="field">
              <span>Requisitos</span>
              <textarea name="requirements" required rows={3} />
            </label>
            <label className="field">
              <span>Protocolo</span>
              <select name="protocolId" required>
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Arquétipo</span>
              <select name="category" required>
                <option value="DEVELOPER">Developer</option>
                <option value="SENTINEL">Sentinel</option>
                <option value="CREATOR">Creator</option>
                <option value="SCHOLAR">Scholar</option>
                <option value="ARCHITECT">Architect</option>
              </select>
            </label>
            <label className="field">
              <span>Dificuldade</span>
              <select name="difficulty" required>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </label>
            <div className="form-row">
              <label className="field">
                <span>XP</span>
                <input name="reputationReward" type="number" defaultValue={50} />
              </label>
              <label className="field">
                <span>USDC (opcional)</span>
                <input name="rewardUsdc" placeholder="1.0" />
              </label>
              <label className="field">
                <span>Rep. mínima</span>
                <input name="minReputation" type="number" defaultValue={0} />
              </label>
              <label className="field">
                <span>Streak mínimo</span>
                <input name="minStreak" type="number" defaultValue={0} />
              </label>
            </div>

            <MissionMilestonesEditor />

            <button className="button primary" type="submit">
              Publicar bounty
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
