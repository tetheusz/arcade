import Link from "next/link";
import { LogoutButton } from "@/components/admin/logout-button";
import { SiteHeader } from "@/components/site-header";
import { requireAdminSession } from "@/lib/auth";
import { getChallengeAdminOverview } from "@/lib/challenge-admin";
import { getAllPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminSession();
  const [posts, challengeOverview] = await Promise.all([
    getAllPosts(),
    getChallengeAdminOverview(),
  ]);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="admin-shell stack-lg">
        <section className="admin-heading">
          <div>
            <p className="eyebrow">Painel</p>
            <h1>Admin do Arcade</h1>
          </div>

          <div className="row-actions">
            <Link href="/admin/posts/order" className="button secondary">
              Ordem dos posts
            </Link>
            <Link href="/admin/bounties" className="button secondary">
              Bounties
            </Link>
            <Link href="/admin/new" className="button primary">
              Novo post
            </Link>
            <LogoutButton />
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <span className="panel-label">Publicados</span>
            <strong>{posts.filter((post) => post.status === "published").length}</strong>
          </article>
          <article className="dashboard-card">
            <span className="panel-label">Rascunhos de posts</span>
            <strong>{posts.filter((post) => post.status === "draft").length}</strong>
          </article>
          <article className="dashboard-card">
            <span className="panel-label">Traduções</span>
            <strong>{posts.filter((post) => post.kind === "translation").length}</strong>
          </article>
          <article className="dashboard-card">
            <span className="panel-label">Artigos autorais</span>
            <strong>{posts.filter((post) => post.kind === "article").length}</strong>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <span className="panel-label">Desafios de hoje</span>
            <strong>{challengeOverview.publishedToday}</strong>
          </article>
          <article className="dashboard-card">
            <span className="panel-label">Desafios publicados</span>
            <strong>{challengeOverview.totalPublished}</strong>
          </article>
          <article className="dashboard-card">
            <span className="panel-label">Rascunhos de jogo</span>
            <strong>{challengeOverview.drafts}</strong>
          </article>
        </section>

        <section className="section-card stack-sm">
          <div className="section-heading">
            <p className="eyebrow">Gameplay</p>
            <h2>Operação dos desafios</h2>
          </div>

          <div className="row-actions">
            <Link href="/admin/challenges" className="button secondary">
              Gerenciar desafios
            </Link>
            <Link href="/admin/lab" className="button secondary">
              Laboratório de IA
            </Link>
          </div>
        </section>

        <section className="stack-sm">
          <div className="section-heading">
            <p className="eyebrow">Posts</p>
            <h2>Gerenciar conteúdo</h2>
          </div>

          <div className="table-shell">
            <table className="posts-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isAutoTranslation = post.tags.includes("auto-traducao");

                  return (
                  <tr key={post.id}>
                    <td>
                      <div className="stack-xs">
                        <strong>
                          {isAutoTranslation ? "[Auto] " : ""}
                          {post.title}
                        </strong>
                        <span className="muted">{post.slug}</span>
                      </div>
                    </td>
                    <td>{post.kind === "translation" ? "Tradução" : "Artigo"}</td>
                    <td>{post.status === "published" ? "Publicado" : "Rascunho"}</td>
                    <td>{formatDate(post.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="text-link" href={`/admin/posts/${post.slug}/edit`}>
                          Editar
                        </Link>
                        <Link className="text-link" href={`/posts/${post.slug}`}>
                          Ver
                        </Link>
                        <form
                          action={`/api/admin/posts/${post.slug}/delete`}
                          method="post"
                        >
                          <button type="submit" className="text-button danger">
                            Excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
