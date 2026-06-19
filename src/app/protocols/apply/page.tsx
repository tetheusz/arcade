import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtocolApplyPage() {
  const session = await getSession();
  if (!session) redirect("/entrar?next=%2Fprotocols%2Fapply");

  return (
    <div className="shell">
      <SiteHeader />
      <main className="stack-xl">
        <section className="section-card" style={{ maxWidth: 640 }}>
          <h1>Candidatar protocolo</h1>
          <form
            className="stack-md"
            action={async (formData) => {
              "use server";
              const { applyProtocolAction } = await import("@/actions/protocols");
              await applyProtocolAction({
                name: String(formData.get("name")),
                description: String(formData.get("description")),
                website: String(formData.get("website")),
                twitter: String(formData.get("twitter") ?? ""),
              });
              redirect("/protocols");
            }}
          >
            <label className="field">
              <span>Nome do protocolo</span>
              <input name="name" required />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea name="description" required rows={4} />
            </label>
            <label className="field">
              <span>Website</span>
              <input name="website" type="url" required />
            </label>
            <label className="field">
              <span>Twitter (opcional)</span>
              <input name="twitter" />
            </label>
            <button className="button primary" type="submit">
              Enviar candidatura
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
