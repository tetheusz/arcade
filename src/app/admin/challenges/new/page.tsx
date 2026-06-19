import Link from "next/link";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { getDateKey } from "@/lib/utils";

type NewChallengePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewChallengePage({ searchParams }: NewChallengePageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="shell">
      <SiteHeader />

      <main className="admin-shell stack-lg">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">Desafios</p>
            <h1>Novo desafio</h1>
          </div>

          <Link href="/admin/challenges" className="button secondary">
            Voltar
          </Link>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="section-card stack-md">
          <div className="section-heading">
            <p className="eyebrow">Setup</p>
            <h2>Preencha a rodada do dia</h2>
            <p className="muted">
              Dica: para hoje em São Paulo, use {getDateKey()}.
            </p>
          </div>

          <ChallengeForm
            action="/api/admin/challenges"
            submitLabel="Criar desafio"
            defaultDateKey={getDateKey()}
          />
        </section>
      </main>
    </div>
  );
}
