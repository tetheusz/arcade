import Link from "next/link";
import { PostForm } from "@/components/admin/post-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { getRequiredPost } from "@/lib/posts";

type EditPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: EditPostPageProps) {
  await requireAdminSession();
  const { slug } = await params;
  const { error } = await searchParams;
  const post = await getRequiredPost(slug);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="admin-shell stack-lg">
        <div className="section-heading">
          <p className="eyebrow">Editar</p>
          <h1>{post.title}</h1>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <PostForm
          action={`/api/admin/posts/${post.slug}`}
          post={post}
          submitLabel="Atualizar post"
        />

        <Link className="text-link" href="/admin">
          Voltar ao painel
        </Link>
      </main>
    </div>
  );
}
