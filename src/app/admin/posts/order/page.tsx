import Link from "next/link";
import { PostOrderEditor } from "@/components/admin/post-order-editor";
import { LogoutButton } from "@/components/admin/logout-button";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { getPublishedPostsForAdminOrder } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function AdminPostOrderPage() {
  await requireAdminSession();
  const posts = await getPublishedPostsForAdminOrder();

  return (
    <div className="shell">
      <SiteHeader />
      <main className="admin-shell stack-lg">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">Posts</p>
            <h1>Ordem e destaque</h1>
          </div>

          <div className="row-actions">
            <Link href="/admin" className="button secondary">
              Voltar ao painel
            </Link>
            <LogoutButton />
          </div>
        </section>

        <section className="section-card stack-sm">
          {posts.length > 0 ? (
            <PostOrderEditor posts={posts} />
          ) : (
            <div className="empty-state">
              <p>Publique posts para poder reordená-los na home.</p>
              <Link href="/admin/new" className="button primary">
                Criar post
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
