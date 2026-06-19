"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ResilientCoverImage } from "@/components/posts/resilient-cover-image";
import type { PostListItem } from "@/lib/posts";
import type { PostKind } from "@/types/post";
import { formatDate } from "@/lib/utils";

type PostArchiveProps = {
  posts: PostListItem[];
};

function normalizeValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getKindLabel(kind: PostKind) {
  return kind === "translation" ? "Tradução" : "Artigo";
}

export function PostArchive({ posts }: PostArchiveProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | PostKind>("all");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeValue(deferredQuery);

  const filteredPosts = posts.filter((post) => {
    const matchesKind = kind === "all" ? true : post.kind === kind;

    if (!normalizedQuery) {
      return matchesKind;
    }

    const searchableContent = normalizeValue(
      [post.title, post.summary, post.tags.join(" ")].join(" "),
    );

    return matchesKind && searchableContent.includes(normalizedQuery);
  });

  return (
    <section className="archive-shell">
      <div className="archive-toolbar">
        <label className="archive-search">
          <span className="panel-label">Buscar no arquivo</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, tema ou tag"
          />
        </label>

        <div className="archive-filters" aria-label="Filtrar posts">
          <button
            type="button"
            className={kind === "all" ? "archive-filter archive-filter--active" : "archive-filter"}
            onClick={() => setKind("all")}
          >
            Tudo
          </button>
          <button
            type="button"
            className={kind === "article" ? "archive-filter archive-filter--active" : "archive-filter"}
            onClick={() => setKind("article")}
          >
            Artigos
          </button>
          <button
            type="button"
            className={kind === "translation" ? "archive-filter archive-filter--active" : "archive-filter"}
            onClick={() => setKind("translation")}
          >
            Traduções
          </button>
        </div>
      </div>

      <div className="archive-results">
        <p className="panel-label">
          {filteredPosts.length} {filteredPosts.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      <div className="archive-list">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, index) => (
            <Link key={post.id} className="archive-row" href={`/posts/${post.slug}`}>
              <div
                className={`archive-row__media archive-row__media--${post.kind}${post.coverImageUrl ? " archive-row__media--with-image" : ""}`}
              >
                <ResilientCoverImage
                  className="archive-row__image"
                  src={post.coverImageUrl}
                  alt={`Capa de ${post.title}`}
                  fallback={
                    <>
                      <span className="archive-row__arc archive-row__arc--one" />
                      <span className="archive-row__arc archive-row__arc--two" />
                      <span className="archive-row__orb archive-row__orb--one" />
                      <span className="archive-row__orb archive-row__orb--two" />
                    </>
                  }
                />
              </div>

              <div className="archive-row__content">
                <div className="archive-row__meta">
                  <span className={`kind-pill kind-pill--${post.kind}`}>
                    {getKindLabel(post.kind)}
                  </span>
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>

                <h2>{post.title}</h2>
                <p>{post.summary}</p>

                <div className="archive-row__footer">
                  <div className="archive-row__tags">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <span className="text-link">Abrir artigo</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>Nenhum post apareceu com esse filtro. Tente outro termo.</p>
          </div>
        )}
      </div>
    </section>
  );
}
