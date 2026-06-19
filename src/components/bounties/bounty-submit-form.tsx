"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitMissionAction } from "@/actions/bounties";

type BountySubmitFormProps = {
  missionId: string;
};

export function BountySubmitForm({ missionId }: BountySubmitFormProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitMissionAction({
        missionId,
        title: String(form.get("title") ?? ""),
        evidence: String(form.get("evidence") ?? ""),
        links: String(form.get("links") ?? ""),
      });

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form className="stack-md" onSubmit={handleSubmit}>
      <label className="field">
        <span>Título da entrega</span>
        <input name="title" required placeholder="Ex: PR #42 — tradução deploy-on-arc" />
      </label>
      <label className="field">
        <span>Evidência / descrição</span>
        <textarea
          name="evidence"
          required
          rows={5}
          placeholder="Descreva o que você fez e como validar."
        />
      </label>
      <label className="field">
        <span>Links (GitHub, PR, post)</span>
        <input name="links" placeholder="https://github.com/..." />
      </label>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Submeter entrega"}
      </button>
    </form>
  );
}
