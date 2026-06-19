import { SiteHeader } from "@/components/site-header";
import { PostArchive } from "@/components/posts/post-archive";
import { getPublishedPostsList } from "@/lib/posts";

export const revalidate = 120;

export default async function PostsPage() {
  const posts = await getPublishedPostsList();
  const articleCount = posts.filter((post) => post.kind === "article").length;
  const translationCount = posts.filter((post) => post.kind === "translation").length;

  return (
    <div className="shell shell--journal">
      <SiteHeader />

      <main className="archive-page">
        <section className="archive-hero">
          <div className="archive-hero__copy">
            <p className="eyebrow">Arquivo editorial</p>
            <h1>Artigos autorais e traduções para builders de Arc.</h1>
            <p>
              Uma biblioteca viva para acompanhar Arc com mais clareza,
              onboarding e contexto técnico em português.
            </p>
          </div>

          <div className="archive-hero__stats">
            <div>
              <strong>{posts.length}</strong>
              <span>leituras publicadas</span>
            </div>
            <div>
              <strong>{articleCount}</strong>
              <span>artigos autorais</span>
            </div>
            <div>
              <strong>{translationCount}</strong>
              <span>traduções curadas</span>
            </div>
          </div>
        </section>

        <PostArchive posts={posts} />
      </main>
    </div>
  );
}
