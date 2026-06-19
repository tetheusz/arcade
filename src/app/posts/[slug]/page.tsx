import Link from "next/link";
import { ResilientCoverImage } from "@/components/posts/resilient-cover-image";
import { MarkdownBody } from "@/components/posts/markdown-body";
import { SiteHeader } from "@/components/site-header";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function getKindLabel(kind: "article" | "translation") {
  return kind === "translation" ? "Tradução em PT-BR" : "Artigo autoral";
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published") {
    return (
      <div className="shell">
        <SiteHeader />
        <main className="narrow stack-md">
          <p className="eyebrow">Post não encontrado</p>
          <h1>Esse artigo ainda não foi publicado.</h1>
          <Link className="text-link" href="/">
            Voltar ao início
          </Link>
        </main>
      </div>
    );
  }

  const relatedPosts = await getRelatedPosts(post.slug);

  return (
    <div className="shell">
      <SiteHeader />
      <main className="article-shell">
        <article className="article-page">
          <div className="article-topbar">
            <Link className="text-link" href="/posts">
              Voltar ao arquivo
            </Link>
            {post.kind === "translation" && post.sourceUrl ? (
              <a
                className="text-link"
                href={post.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ver fonte oficial
              </a>
            ) : null}
          </div>

          <div className="article-cover">
            <div
              className={`article-cover__art article-cover__art--${post.kind === "translation" ? "translation" : "article"}${post.coverImageUrl ? " article-cover__art--with-image" : ""}`}
            >
              <ResilientCoverImage
                className="article-cover__image"
                src={post.coverImageUrl}
                alt={`Capa de ${post.title}`}
                priority
                sizes="(max-width: 960px) 100vw, 960px"
                fallback={
                  <>
                    <span className="article-cover__arc article-cover__arc--one" />
                    <span className="article-cover__arc article-cover__arc--two" />
                    <span className="article-cover__orb article-cover__orb--one" />
                    <span className="article-cover__orb article-cover__orb--two" />
                  </>
                }
              />
            </div>
          </div>

          <div className="article article-layout stack-md">
            <div className="stack-sm">
              <div className="card-topline">
                <p className="eyebrow">{formatDate(post.publishedAt)}</p>
                <span className={`kind-pill kind-pill--${post.kind}`}>
                  {getKindLabel(post.kind)}
                </span>
              </div>
              <h1>{post.title}</h1>
              <p className="article-summary">{post.summary}</p>
              <div className="meta-row article-tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              {post.kind === "translation" && post.sourceUrl ? (
                <div className="source-card">
                  <p className="panel-label">Fonte original</p>
                  <p>
                    Tradução em PT-BR baseada em{" "}
                    <a href={post.sourceUrl} target="_blank" rel="noreferrer">
                      {post.sourceTitle ?? "material oficial do Arc"}
                    </a>
                    .
                  </p>
                </div>
              ) : null}
            </div>

            <MarkdownBody content={post.content} />

            <div className="article-author">
              <div className="article-author__avatar" />
              <div className="article-author__copy">
                <span className="panel-label">Publicado por</span>
                <strong>Arcade editorial</strong>
                <p>
                  Curadoria em português para acompanhar Arc com mais contexto,
                  menos ruído e foco real em builders.
                </p>
              </div>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 ? (
          <section className="similar-articles">
            <div className="section-heading">
              <h2>Leituras relacionadas</h2>
            </div>

            <div className="similar-articles__grid">
              {relatedPosts.map((entry, index) => (
                <Link key={entry.id} className="similar-post similar-post--linked" href={`/posts/${entry.slug}`}>
                  <div className={`similar-post__thumb similar-post__thumb--${(index % 3) + 1}${entry.coverImageUrl ? " similar-post__thumb--with-image" : ""}`}>
                    <ResilientCoverImage
                      className="similar-post__image"
                      src={entry.coverImageUrl}
                      alt={`Capa de ${entry.title}`}
                    />
                  </div>
                  <div className="similar-post__body">
                    <div className="guide-post__meta">
                      <span>{formatDate(entry.publishedAt)}</span>
                      <span>{entry.kind === "translation" ? "Tradução" : "Artigo"}</span>
                    </div>
                    <h3>{entry.title}</h3>
                    <p>{entry.summary}</p>
                    <span className="text-link">Ler artigo</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
