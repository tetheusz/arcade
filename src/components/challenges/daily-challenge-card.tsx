import Link from "next/link";
import { ChallengeAnswerForm } from "@/components/challenges/challenge-answer-form";
import type { DailyChallengeWithProgress } from "@/types/challenge";

type DailyChallengeCardProps = {
  challenge: DailyChallengeWithProgress;
  isAuthenticated: boolean;
};

const categoryMeta = {
  word: {
    label: "Termo",
    description: "Palavra do dia com feedback por letra e ritmo rápido.",
  },
  connection: {
    label: "Conexo",
    description: "Encontre grupos de quatro itens com a lógica certa.",
  },
  security: {
    label: "Segurança",
    description: "Raciocínio técnico e leitura de padrões Web3.",
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function DailyChallengeCard({
  challenge,
  isAuthenticated,
}: DailyChallengeCardProps) {
  const meta = categoryMeta[challenge.category];
  const payload = isRecord(challenge.payload) ? challenge.payload : {};
  const snippet =
    typeof payload.snippet === "string" ? payload.snippet : null;
  const clue = typeof payload.clue === "string" ? payload.clue : null;
  const attemptsLabel = challenge.progress
    ? `${challenge.progress.attemptsCount} tentativa${challenge.progress.attemptsCount === 1 ? "" : "s"}`
    : "Novo";
  const statusLabel = challenge.progress?.isSolved ? "Resolvido" : attemptsLabel;
  const groupCount =
    challenge.category === "connection" && typeof payload.groupCount === "number"
      ? payload.groupCount
      : null;

  return (
    <article className={`challenge-card challenge-card--${challenge.category}`}>
      <div className="challenge-card__header">
        <div className="card-topline">
          <p className="eyebrow">{meta.label}</p>
          <span className="kind-pill kind-pill--translation">
            {challenge.basePoints * challenge.difficulty} pts
          </span>
        </div>

        <div className="challenge-meta">
          <span>Dificuldade x{challenge.difficulty}</span>
          <span>{meta.description}</span>
        </div>
      </div>

      <div className="challenge-status-bar">
        <span className={`challenge-status-pill${challenge.progress?.isSolved ? " challenge-status-pill--solved" : ""}`}>
          {statusLabel}
        </span>
        {challenge.category === "word" && typeof payload.maxAttempts === "number" ? (
          <span>{payload.maxAttempts} tentativas máximas</span>
        ) : null}
        {groupCount ? <span>{groupCount} grupos no tabuleiro</span> : null}
        {challenge.category === "security" ? <span>Resposta curta em inglês</span> : null}
      </div>

      <div className="stack-sm">
        <h3>{challenge.title}</h3>
        <p className="muted">{challenge.teaser}</p>
      </div>

      <p>{challenge.prompt}</p>

      {challenge.instructions ? (
        <p className="challenge-helper">{challenge.instructions}</p>
      ) : null}

      {clue ? <p className="challenge-helper">Dica: {clue}</p> : null}

      {snippet ? (
        <div className="challenge-snippet-shell">
          <span className="panel-label">Trecho para revisar</span>
          <pre className="challenge-snippet">
            <code>{snippet}</code>
          </pre>
        </div>
      ) : null}

      {challenge.progress?.isSolved ? (
        <div className="success-banner">
          Resolvido. +{challenge.progress.pointsAwarded} pontos adicionados ao seu perfil.
        </div>
      ) : isAuthenticated ? (
        <ChallengeAnswerForm challenge={challenge} />
      ) : (
        <div className="challenge-cta">
          <p className="muted">
            Entre para responder, registrar streak e subir no ranking.
          </p>
          <Link className="button primary" href="/entrar">
            Entrar para jogar
          </Link>
        </div>
      )}
    </article>
  );
}
