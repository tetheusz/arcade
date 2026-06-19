import Link from "next/link";
import { PostForm } from "@/components/admin/post-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";

type NewPostPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  await requireAdminSession();
  const { error } = await searchParams;

  return (
    <div className="shell">
      <SiteHeader />
      <main className="admin-shell stack-lg">
        <div className="section-heading">
          <p className="eyebrow">Novo post</p>
          <h1>Criar conteúdo</h1>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <PostForm action="/api/admin/posts" submitLabel="Salvar post" />

        <Link className="text-link" href="/admin">
          Voltar ao painel
        </Link>
      </main>
    </div>
  );
}
