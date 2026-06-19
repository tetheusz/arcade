"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import type { Post } from "@/types/post";

type PostFormProps = {
  action: string;
  post?: Post;
  submitLabel: string;
};

export function PostForm({ action, post, submitLabel }: PostFormProps) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(post?.coverImageUrl ?? "");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  return (
    <form
      action={action}
      method="post"
      encType="multipart/form-data"
      className="admin-form"
    >
      <label className="field">
        <span>Tipo de conteúdo</span>
        <select name="kind" defaultValue={post?.kind ?? "article"}>
          <option value="article">Artigo autoral</option>
          <option value="translation">Tradução</option>
        </select>
      </label>

      <label className="field">
        <span>Título</span>
        <input
          type="text"
          name="title"
          defaultValue={post?.title ?? ""}
          minLength={4}
          maxLength={120}
          required
        />
      </label>

      <label className="field">
        <span>Slug</span>
        <input
          type="text"
          name="slug"
          defaultValue={post?.slug ?? ""}
          placeholder="deixe vazio para gerar automaticamente"
          maxLength={80}
        />
      </label>

      <label className="field">
        <span>Resumo</span>
        <textarea
          name="summary"
          defaultValue={post?.summary ?? ""}
          rows={3}
          minLength={12}
          maxLength={220}
          required
        />
      </label>

      <div className="field">
        <span>Capa do post</span>
        <div className="cover-input-grid">
          <label className="field">
            <span>Upload de imagem</span>
            <input
              type="file"
              name="coverImageFile"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (!file) {
                  setSelectedFileName("");

                  if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    setObjectUrl(null);
                  }

                  setPreviewUrl(removeCoverImage ? "" : post?.coverImageUrl ?? "");
                  return;
                }

                const nextObjectUrl = URL.createObjectURL(file);

                if (objectUrl) {
                  URL.revokeObjectURL(objectUrl);
                }

                setObjectUrl(nextObjectUrl);
                setPreviewUrl(nextObjectUrl);
                setSelectedFileName(file.name);
              }}
            />
            <small className="field-hint">
              PNG, JPG, WebP, GIF ou AVIF com no máximo 5 MB.
            </small>
            {selectedFileName ? (
              <small className="field-hint">Arquivo selecionado: {selectedFileName}</small>
            ) : null}
          </label>

          <label className="field">
            <span>Ou URL externa</span>
            <input
              type="url"
              name="coverImageUrl"
              defaultValue={post?.coverImageUrl ?? ""}
              placeholder="https://images.unsplash.com/..."
              maxLength={500}
              disabled={removeCoverImage}
              onChange={(event) => {
                if (objectUrl) {
                  return;
                }

                setPreviewUrl(event.currentTarget.value.trim());
              }}
            />
            <small className="field-hint">
              Se existir upload e URL ao mesmo tempo, o upload tem prioridade.
            </small>
          </label>
        </div>

        {post?.coverImageUrl ? (
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="removeCoverImage"
              checked={removeCoverImage}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setRemoveCoverImage(checked);

                if (checked) {
                  if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    setObjectUrl(null);
                  }

                  setSelectedFileName("");
                  setPreviewUrl("");
                  return;
                }

                setPreviewUrl(objectUrl ?? post.coverImageUrl ?? "");
              }}
            />
            <span>Remover capa atual ao salvar</span>
          </label>
        ) : null}
      </div>

      <div className="field">
        <span>Preview da capa</span>
        <div className="admin-cover-preview">
          {previewUrl ? (
            <img src={previewUrl} alt={`Capa de ${post?.title ?? "novo post"}`} />
          ) : (
            <div className="admin-cover-preview__placeholder">
              Nenhuma capa selecionada ainda.
            </div>
          )}
        </div>
      </div>

      <label className="field">
        <span>Título original</span>
        <input
          type="text"
          name="sourceTitle"
          defaultValue={post?.sourceTitle ?? ""}
          placeholder="Obrigatório para traduções"
          maxLength={180}
        />
      </label>

      <label className="field">
        <span>URL da fonte original</span>
        <input
          type="url"
          name="sourceUrl"
          defaultValue={post?.sourceUrl ?? ""}
          placeholder="https://docs.arc.network/..."
          maxLength={400}
        />
      </label>

      <label className="field">
        <span>Tags</span>
        <input
          type="text"
          name="tags"
          defaultValue={post?.tags.join(", ") ?? ""}
          placeholder="arc, pt-br, onboarding"
        />
      </label>

      <label className="field">
        <span>Status</span>
        <select name="status" defaultValue={post?.status ?? "draft"}>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
      </label>

      <label className="field">
        <span>Conteúdo em Markdown</span>
        <textarea
          name="content"
          defaultValue={post?.content ?? ""}
          rows={18}
          minLength={40}
          required
        />
      </label>

      <button className="button primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
