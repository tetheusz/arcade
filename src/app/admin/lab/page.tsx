import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { aiLabStatus } from "@/lib/ai-lab";

export const dynamic = "force-dynamic";

export default async function AdminLabPage() {
  await requireAdminSession();

  return (
    <div className="shell">
      <SiteHeader />

      <main className="admin-shell stack-lg">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">AI Lab</p>
            <h1>Camada de geração</h1>
          </div>

          <Link href="/admin" className="button secondary">
            Voltar ao admin
          </Link>
        </section>

        <section className="product-sections">
          <article className="section-card">
            <div className="section-heading">
              <p className="eyebrow">Status</p>
              <h2>Conexão com provedor</h2>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <strong>Ligado</strong>
                <p>{aiLabStatus.enabled ? "Sim" : "Não"}</p>
              </div>
              <div className="feature-item">
                <strong>Modo</strong>
                <p>{aiLabStatus.mode}</p>
              </div>
              <div className="feature-item">
                <strong>Validação</strong>
                <p>{aiLabStatus.validation}</p>
              </div>
            </div>
          </article>

          <article className="section-card">
            <div className="section-heading">
              <p className="eyebrow">Roadmap</p>
              <h2>Como ligar a IA com segurança</h2>
            </div>

            <div className="feature-list">
              {aiLabStatus.capabilities.map((capability) => (
                <div key={capability} className="feature-item">
                  <strong>{capability}</strong>
                  <p>Capacidade prevista nessa camada.</p>
                </div>
              ))}
              <div className="feature-item">
                <strong>Observação</strong>
                <p>{aiLabStatus.note}</p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
