"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import { updateProfileAction } from "@/actions/profile";
import { parseSkills } from "@/lib/profile-display";

type ProfileEditorProps = {
  initial: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    avatarPreviewUrl: string;
    skills: string;
    region: string;
    twitter: string;
    github: string;
    website: string;
    discord: string;
  };
};

export function ProfileEditor({ initial }: ProfileEditorProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState(initial.avatarPreviewUrl);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProfileAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage("Perfil atualizado.");
      window.location.reload();
    });
  }

  return (
    <article className="section-card profile-editor">
      <button
        type="button"
        className="profile-editor__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div>
          <p className="eyebrow">Identidade</p>
          <h2>Editar perfil</h2>
          <p className="muted">Nome, foto, bio, habilidades e links sociais.</p>
        </div>
        <span className="profile-editor__chevron" data-open={open}>
          ▾
        </span>
      </button>

      {open ? (
        <form className="profile-editor__form" onSubmit={handleSubmit}>
          <div className="profile-editor__grid">
            <label className="profile-editor__field profile-editor__field--wide">
              <span>Nome de exibição</span>
              <input
                name="displayName"
                defaultValue={initial.displayName}
                placeholder="Como você quer aparecer no Arcade"
                maxLength={80}
              />
            </label>

            <div className="profile-editor__field profile-editor__field--wide">
              <span>Foto de perfil</span>
              <div className="profile-editor__avatar-grid">
                <label className="profile-editor__field">
                  <span>Upload de arquivo</span>
                  <input
                    type="file"
                    name="avatarFile"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];

                      if (!file) {
                        setSelectedFileName("");

                        if (objectUrl) {
                          URL.revokeObjectURL(objectUrl);
                          setObjectUrl(null);
                        }

                        setAvatarPreview(initial.avatarPreviewUrl);
                        return;
                      }

                      const nextObjectUrl = URL.createObjectURL(file);

                      if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                      }

                      setObjectUrl(nextObjectUrl);
                      setAvatarPreview(nextObjectUrl);
                      setSelectedFileName(file.name);
                    }}
                  />
                  <small className="muted">
                    PNG, JPG, WebP, GIF ou AVIF com no máximo 5 MB.
                  </small>
                  {selectedFileName ? (
                    <small className="muted">Arquivo selecionado: {selectedFileName}</small>
                  ) : null}
                </label>

                <label className="profile-editor__field">
                  <span>Ou URL externa</span>
                  <input
                    name="avatarUrl"
                    defaultValue={initial.avatarUrl}
                    placeholder="https://…"
                    onChange={(event) => {
                      if (selectedFileName) {
                        return;
                      }

                      setAvatarPreview(event.target.value || initial.avatarPreviewUrl);
                    }}
                  />
                </label>
              </div>

              {avatarPreview ? (
                <div className="profile-editor__preview">
                  <img src={avatarPreview} alt="" width={72} height={72} />
                </div>
              ) : null}
            </div>

            <label className="profile-editor__field profile-editor__field--wide">
              <span>Bio</span>
              <textarea
                name="bio"
                defaultValue={initial.bio}
                placeholder="Conte o que você constrói, estuda ou cria no ecossistema Arc."
                rows={4}
                maxLength={500}
              />
            </label>

            <label className="profile-editor__field profile-editor__field--wide">
              <span>Habilidades</span>
              <input
                name="skills"
                defaultValue={initial.skills}
                placeholder="Solidity, React, design, tradução… (separadas por vírgula)"
              />
              <small className="muted">
                {parseSkills(initial.skills).length > 0
                  ? `${parseSkills(initial.skills).length} habilidades`
                  : "Até 12 tags"}
              </small>
            </label>

            <label className="profile-editor__field">
              <span>Região</span>
              <input
                name="region"
                defaultValue={initial.region}
                placeholder="Brasil, LATAM, Global…"
                maxLength={80}
              />
            </label>

            <label className="profile-editor__field">
              <span>Twitter / X</span>
              <input
                name="twitter"
                defaultValue={initial.twitter}
                placeholder="@handle ou URL"
              />
            </label>

            <label className="profile-editor__field">
              <span>GitHub</span>
              <input
                name="github"
                defaultValue={initial.github}
                placeholder="usuario ou URL"
              />
            </label>

            <label className="profile-editor__field">
              <span>Website</span>
              <input
                name="website"
                defaultValue={initial.website}
                placeholder="https://…"
              />
            </label>

            <label className="profile-editor__field">
              <span>Discord</span>
              <input
                name="discord"
                defaultValue={initial.discord}
                placeholder="usuario ou invite"
              />
            </label>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}
          {message ? <p className="success-banner">{message}</p> : null}

          <div className="profile-editor__actions">
            <button type="submit" className="button primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar perfil"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
