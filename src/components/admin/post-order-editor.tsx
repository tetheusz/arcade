"use client";

import { useState, useTransition } from "react";
import { reorderPostsAction, setFeaturedPostAction } from "@/actions/posts";

type OrderPost = {
  id: string;
  title: string;
  slug: string;
  featured: boolean;
};

type PostOrderEditorProps = {
  posts: OrderPost[];
};

export function PostOrderEditor({ posts: initialPosts }: PostOrderEditorProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function moveItem(from: number, to: number) {
    if (from === to) return;
    const next = [...posts];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setPosts(next);
    return next;
  }

  function persistOrder(nextPosts: OrderPost[]) {
    startTransition(async () => {
      const result = await reorderPostsAction(nextPosts.map((post) => post.id));
      setMessage(result.success ? "Ordem salva." : result.error);
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    const next = moveItem(dragIndex, targetIndex);
    setDragIndex(null);

    if (next) {
      persistOrder(next);
    }
  }

  function handleFeatured(postId: string) {
    startTransition(async () => {
      const result = await setFeaturedPostAction(postId);
      if (result.success) {
        setPosts((current) =>
          current.map((post) => ({
            ...post,
            featured: post.id === postId,
          })),
        );
        setMessage("Destaque atualizado.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="stack-sm">
      <p className="muted">
        Arraste para reordenar a home e o arquivo. O post marcado como destaque
        aparece no hero da página inicial.
      </p>

      {message ? <p className="notice">{message}</p> : null}

      <ul className="post-order-list" aria-busy={isPending}>
        {posts.map((post, index) => (
          <li
            key={post.id}
            className={`post-order-item${dragIndex === index ? " post-order-item--dragging" : ""}`}
            draggable={!isPending}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
          >
            <span className="post-order-item__handle" aria-hidden="true">
              ⋮⋮
            </span>
            <div className="stack-xs">
              <strong>{post.title}</strong>
              <span className="muted">{post.slug}</span>
            </div>
            <div className="row-actions">
              {post.featured ? (
                <span className="post-order-item__featured">Destaque</span>
              ) : (
                <button
                  type="button"
                  className="button secondary"
                  disabled={isPending}
                  onClick={() => handleFeatured(post.id)}
                >
                  Destacar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
