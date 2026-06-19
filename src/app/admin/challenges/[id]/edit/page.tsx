import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { getChallengeById } from "@/lib/challenge-admin";

type EditChallengePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditChallengePage({
  params,
  searchParams,
}: EditChallengePageProps) {
  await requireAdminSession();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const challenge = await getChallengeById(id);

  if (!challenge) {
    notFound();
  }

  return (
    <div className="shell">
      <SiteHeader />

      <main className="admin-shell stack-lg">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">Desafios</p>
            <h1>{challenge.title}</h1>
          </div>

          <Link href="/admin/challenges" className="button secondary">
            Voltar
          </Link>
        </section>

        {resolvedSearchParams?.error ? (
          <p className="error-banner">{resolvedSearchParams.error}</p>
        ) : null}

        <section className="section-card stack-md">
          <div className="section-heading">
            <p className="eyebrow">Edição</p>
            <h2>Atualize o desafio</h2>
          </div>

          <ChallengeForm
            action={`/api/admin/challenges/${challenge.id}`}
            challenge={challenge}
            submitLabel="Salvar alterações"
          />
        </section>
      </main>
    </div>
  );
}
