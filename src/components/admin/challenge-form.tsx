"use client";

import { useState } from "react";
import { getChallengeFormDefaults } from "@/lib/challenge-form";
import type { ChallengeAdminRecord } from "@/types/challenge-admin";

type ChallengeFormProps = {
  action: string;
  challenge?: ChallengeAdminRecord;
  submitLabel: string;
  defaultDateKey?: string;
};

export function ChallengeForm({
  action,
  challenge,
  submitLabel,
  defaultDateKey,
}: ChallengeFormProps) {
  const defaults = getChallengeFormDefaults(challenge);
  const [category, setCategory] = useState(defaults.category);

  return (
    <form action={action} method="post" className="admin-form">
      <div className="challenge-form-grid">
        <label className="field">
          <span>Data</span>
          <input
            type="date"
            name="dateKey"
            defaultValue={defaults.dateKey || defaultDateKey || ""}
            required
          />
        </label>

        <label className="field">
          <span>Categoria</span>
          <select
            name="category"
            defaultValue={defaults.category}
            onChange={(event) => setCategory(event.target.value as typeof defaults.category)}
          >
            <option value="word">Termo</option>
            <option value="connection">Conexo</option>
            <option value="security">Segurança</option>
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={defaults.status}>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>

        <label className="field">
          <span>Origem</span>
          <input name="sourceLabel" defaultValue={defaults.sourceLabel} maxLength={60} required />
        </label>
      </div>

      <label className="field">
        <span>Título</span>
        <input name="title" defaultValue={defaults.title} minLength={4} maxLength={120} required />
      </label>

      <label className="field">
        <span>Teaser</span>
        <input
          name="teaser"
          defaultValue={defaults.teaser}
          minLength={8}
          maxLength={160}
          required
        />
      </label>

      <label className="field">
        <span>Prompt</span>
        <textarea name="prompt" defaultValue={defaults.prompt} rows={4} minLength={12} required />
      </label>

      <label className="field">
        <span>Instruções</span>
        <textarea name="instructions" defaultValue={defaults.instructions} rows={3} />
      </label>

      <div className="challenge-form-grid">
        <label className="field">
          <span>Dificuldade</span>
          <input
            type="number"
            name="difficulty"
            defaultValue={defaults.difficulty}
            min={1}
            max={5}
            required
          />
        </label>

        <label className="field">
          <span>Pontos base</span>
          <input
            type="number"
            name="basePoints"
            defaultValue={defaults.basePoints}
            min={1}
            max={200}
            required
          />
        </label>

        <label className="field">
          <span>Dica</span>
          <input name="hint" defaultValue={defaults.hint} maxLength={180} />
        </label>
      </div>

      <label className="field">
        <span>Resposta correta</span>
        <input
          name="answer"
          defaultValue={defaults.answer}
          minLength={category === "connection" ? 0 : 2}
          required={category !== "connection"}
          placeholder={
            category === "connection"
              ? "Opcional: nomes dos grupos ou resposta-resumo"
              : ""
          }
        />
      </label>

      <section className={`admin-subsection ${category === "word" ? "is-active" : ""}`}>
        <div className="section-heading">
          <p className="eyebrow">Termo</p>
          <h2>Configuração da palavra</h2>
          <p className="muted">Palavra única, sem espaço, com feedback por letra.</p>
        </div>

        <div className="challenge-form-grid">
          <label className="field">
            <span>Tamanho da palavra</span>
            <input
              type="number"
              name="wordLength"
              defaultValue={defaults.wordLength}
              min={4}
              max={8}
            />
          </label>

          <label className="field">
            <span>Tentativas máximas</span>
            <input
              type="number"
              name="maxAttempts"
              defaultValue={defaults.maxAttempts}
              min={4}
              max={8}
            />
          </label>
        </div>

        <label className="field">
          <span>Dica curta</span>
          <input name="clue" defaultValue={defaults.clue} maxLength={120} />
        </label>
      </section>

      <section className={`admin-subsection ${category === "connection" ? "is-active" : ""}`}>
        <div className="section-heading">
          <p className="eyebrow">Conexo</p>
          <h2>Montagem dos grupos</h2>
          <p className="muted">
            Use uma linha por grupo no formato: Grupo | item1, item2, item3, item4 | descrição
          </p>
        </div>

        <div className="challenge-form-grid">
          <label className="field">
            <span>Limite de erros</span>
            <input
              type="number"
              name="maxMistakes"
              defaultValue={defaults.maxMistakes}
              min={1}
              max={8}
            />
          </label>
        </div>

        <label className="field">
          <span>Grupos</span>
          <textarea
            name="groupsText"
            defaultValue={defaults.groupsText}
            rows={8}
            placeholder="L1 | gas, usdc, usdt, dai | stablecoins&#10;L2 | optimism, base, zksync, arbitrum | rollups"
          />
        </label>
      </section>

      <section className={`admin-subsection ${category === "security" ? "is-active" : ""}`}>
        <div className="section-heading">
          <p className="eyebrow">Security</p>
          <h2>Mini desafio técnico</h2>
          <p className="muted">Pergunta objetiva, snippet opcional e tags para curadoria.</p>
        </div>

        <label className="field">
          <span>Snippet</span>
          <textarea
            name="snippet"
            defaultValue={defaults.snippet}
            rows={6}
            placeholder="function execute() external { ... }"
          />
        </label>

        <label className="field">
          <span>Tags</span>
          <input
            name="tags"
            defaultValue={defaults.tags}
            placeholder="security, solidity, reentrancy"
          />
        </label>
      </section>

      <label className="field">
        <span>Explicação pós-resposta</span>
        <textarea name="explanation" defaultValue={defaults.explanation} rows={4} />
      </label>

      <button className="button primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
