"use client";

import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DailyChallengeWithProgress } from "@/types/challenge";

type WordRowState = {
  value: string;
  evaluation: Array<"correct" | "present" | "absent">;
};

type ConnectionGroupState = {
  label: string;
  description?: string;
  items: string[];
};

type SubmitResponse = {
  error?: string;
  message?: string;
  status?: string;
  attemptState?: Record<string, unknown>;
  revealedAnswer?: string;
  revealedGroups?: ConnectionGroupState[];
  explanation?: string | null;
};

const keyboardRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWordState(raw: string | null) {
  if (!raw) {
    return [] as WordRowState[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (isRecord(parsed) && parsed.mode === "word" && Array.isArray(parsed.rows)) {
      return parsed.rows.filter((row): row is WordRowState => {
        return isRecord(row) && typeof row.value === "string" && Array.isArray(row.evaluation);
      });
    }
  } catch {}

  return [] as WordRowState[];
}

function parseConnectionState(raw: string | null) {
  if (!raw) {
    return {
      foundGroups: [] as ConnectionGroupState[],
      mistakes: 0,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      isRecord(parsed) &&
      parsed.mode === "connection" &&
      Array.isArray(parsed.foundGroups)
    ) {
      return {
        foundGroups: parsed.foundGroups.filter((group): group is ConnectionGroupState => {
          return isRecord(group) && typeof group.label === "string" && Array.isArray(group.items);
        }),
        mistakes: typeof parsed.mistakes === "number" ? parsed.mistakes : 0,
      };
    }
  } catch {}

  return {
    foundGroups: [] as ConnectionGroupState[],
    mistakes: 0,
  };
}

async function submitChallenge(challengeId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/challenges/${challengeId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as SubmitResponse | null;

  if (!payload) {
    throw new Error("Servidor indisponível. Atualize a página e tente novamente.");
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível enviar a resposta.");
  }

  return payload;
}

function ChallengeRevealBanner({
  label,
  answer,
  description,
}: {
  label: string;
  answer?: string | null;
  description?: string | null;
}) {
  return (
    <aside className="challenge-reveal" role="status">
      <span className="challenge-reveal__label">{label}</span>
      {answer ? <strong className="challenge-reveal__answer">{answer}</strong> : null}
      {description ? <p>{description}</p> : null}
    </aside>
  );
}

function WordChallengeForm({ challenge }: { challenge: DailyChallengeWithProgress }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const payload = isRecord(challenge.payload) ? challenge.payload : {};
  const wordLength = typeof payload.wordLength === "number" ? payload.wordLength : 5;
  const maxAttempts = typeof payload.maxAttempts === "number" ? payload.maxAttempts : 6;
  const [rows, setRows] = useState<WordRowState[]>(
    parseWordState(challenge.progress?.lastAnswer ?? null),
  );
  const [currentGuess, setCurrentGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flipRowIndex, setFlipRowIndex] = useState<number | null>(null);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [revealedWord, setRevealedWord] = useState<string | null>(
    challenge.reveal?.word ?? null,
  );
  const [revealExplanation, setRevealExplanation] = useState<string | null>(
    challenge.reveal?.explanation ?? challenge.explanation,
  );
  const [locked, setLocked] = useState(
    (challenge.progress?.attemptsCount ?? 0) >= maxAttempts ||
      challenge.progress?.isSolved === true ||
      Boolean(challenge.reveal?.word),
  );

  const keyboardState = useMemo(() => {
    const map = new Map<string, "correct" | "present" | "absent">();
    const priority = { absent: 1, present: 2, correct: 3 } as const;

    rows.forEach((row) => {
      row.value
        .toUpperCase()
        .split("")
        .forEach((letter, index) => {
          const nextStatus = row.evaluation[index];
          const currentStatus = map.get(letter);

          if (!currentStatus || priority[nextStatus] > priority[currentStatus]) {
            map.set(letter, nextStatus);
          }
        });
    });

    return map;
  }, [rows]);

  const displayedRows = Array.from({ length: maxAttempts }, (_, index) => {
    if (rows[index]) {
      return {
        value: rows[index].value.toUpperCase(),
        evaluation: rows[index].evaluation,
        state: "completed" as const,
      };
    }

    if (index === rows.length && !locked) {
      return {
        value: currentGuess.toUpperCase().padEnd(wordLength, " "),
        evaluation: Array.from({ length: wordLength }, () => "empty" as const),
        state: "active" as const,
      };
    }

    return {
      value: "".padEnd(wordLength, " "),
      evaluation: Array.from({ length: wordLength }, () => "empty" as const),
      state: "empty" as const,
    };
  });

  const submitGuess = () => {
    if (currentGuess.length !== wordLength || locked) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await submitChallenge(challenge.id, { answer: currentGuess });
        const nextRows =
          isRecord(result.attemptState) && Array.isArray(result.attemptState.rows)
            ? (result.attemptState.rows as WordRowState[])
            : rows;
        const submittedRowIndex = nextRows.length - 1;

        setRows(nextRows);
        setFlipRowIndex(submittedRowIndex);

        window.setTimeout(() => {
          setFlipRowIndex(null);
        }, submittedRowIndex * 110 + 600);

        if (result.status === "correct" || result.status === "locked") {
          setLocked(true);
        }

        if (result.status === "incorrect") {
          setShakeRowIndex(submittedRowIndex);
          window.setTimeout(() => setShakeRowIndex(null), 480);
        }

        if (result.revealedAnswer) {
          setRevealedWord(result.revealedAnswer);
          setRevealExplanation(result.explanation ?? challenge.explanation);
        }

        setFeedback(result.message ?? "Jogada registrada.");
        setCurrentGuess("");

        if (result.status === "correct") {
          router.refresh();
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao validar.");
        }
      });
  };

  const applyKeyInput = (key: string) => {
    if (locked || isPending) {
      return;
    }

    if (key === "ENTER") {
      submitGuess();
      return;
    }

    if (key === "BACK") {
      setCurrentGuess((current) => current.slice(0, -1));
      return;
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess((current) => `${current}${key.toLowerCase()}`);
    }
  };

  const handlePhysicalKeyInput = useEffectEvent((key: string) => {
    applyKeyInput(key);
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (locked || isPending) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea") {
          return;
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handlePhysicalKeyInput("ENTER");
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handlePhysicalKeyInput("BACK");
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        handlePhysicalKeyInput(event.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, locked]);

  return (
    <div className="challenge-interaction stack-sm">
      <div className="termo-shell">
        <p className="challenge-helper challenge-helper--centered">
          Você pode usar o teclado físico ou tocar nas teclas abaixo.
        </p>

        <div className="termo-board" aria-label="tabuleiro do desafio de palavra">
          {displayedRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={`word-row${shakeRowIndex === rowIndex ? " word-row--shake" : ""}`}
            >
              {Array.from({ length: wordLength }, (_, cellIndex) => {
                const letter = row.value[cellIndex]?.trim() ?? "";
                const status = row.evaluation[cellIndex] ?? "empty";
                const shouldFlip =
                  row.state === "completed" &&
                  flipRowIndex === rowIndex &&
                  status !== "empty";

                return (
                  <span
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className={`word-cell word-cell--${status} word-cell--${row.state}${
                      shouldFlip ? " word-cell--flip" : ""
                    }`}
                    style={{ ["--cell-index" as string]: cellIndex }}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="termo-meta">
          <span className="muted">
            {rows.length}/{maxAttempts} tentativas
          </span>
          <span className="muted">
            {currentGuess.length}/{wordLength} letras
          </span>
        </div>

        <div className="termo-keyboard" aria-label="teclado virtual do desafio">
          {keyboardRows.map((row) => (
            <div key={row.join("-")} className="termo-keyboard__row">
              {row.map((key) => {
                const status =
                  key === "ENTER" || key === "BACK"
                    ? "action"
                    : keyboardState.get(key) ?? "idle";

                return (
                  <button
                    key={key}
                    type="button"
                    className={`termo-key termo-key--${status} ${
                      key === "ENTER" || key === "BACK" ? "termo-key--wide" : ""
                    }`}
                    disabled={locked || isPending}
                    onClick={() => applyKeyInput(key)}
                  >
                    {key === "BACK" ? "Apagar" : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {revealedWord ? (
        <ChallengeRevealBanner
          label="Palavra-chave revelada"
          answer={revealedWord.toUpperCase()}
          description={revealExplanation}
        />
      ) : null}

      {feedback ? (
        <p
          className={
            feedback.toLowerCase().includes("boa") ||
            feedback.toLowerCase().includes("palavra correta")
              ? "success-banner"
              : "error-banner"
          }
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function ConnectionChallengeForm({ challenge }: { challenge: DailyChallengeWithProgress }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const payload = isRecord(challenge.payload) ? challenge.payload : {};
  const items = Array.isArray(payload.items)
    ? payload.items.filter((item): item is string => typeof item === "string")
    : [];
  const maxSelection = typeof payload.maxSelection === "number" ? payload.maxSelection : 4;
  const maxMistakes = typeof payload.maxMistakes === "number" ? payload.maxMistakes : 4;
  const initialState = parseConnectionState(challenge.progress?.lastAnswer ?? null);
  const revealedOnLoad = challenge.reveal?.groups ?? null;
  const [selected, setSelected] = useState<string[]>([]);
  const [userFoundLabels, setUserFoundLabels] = useState<Set<string>>(
    () => new Set(initialState.foundGroups.map((group) => group.label)),
  );
  const [foundGroups, setFoundGroups] = useState<ConnectionGroupState[]>(
    revealedOnLoad?.length ? revealedOnLoad : initialState.foundGroups,
  );
  const [mistakes, setMistakes] = useState(initialState.mistakes);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardShake, setBoardShake] = useState(false);
  const [solutionRevealed, setSolutionRevealed] = useState(Boolean(revealedOnLoad?.length));
  const [revealExplanation, setRevealExplanation] = useState<string | null>(
    challenge.reveal?.explanation ?? challenge.explanation,
  );
  const [locked, setLocked] = useState(
    challenge.progress?.isSolved === true ||
      initialState.mistakes >= maxMistakes ||
      Boolean(revealedOnLoad?.length),
  );

  const solvedItems = new Set(foundGroups.flatMap((group) => group.items));
  const availableItems = items.filter((item) => !solvedItems.has(item));

  return (
    <div className="challenge-interaction stack-sm">
      {foundGroups.length > 0 ? (
        <div className="connection-groups">
          {foundGroups.map((group) => (
            <article
              key={group.label}
              className={`connection-group${
                solutionRevealed && !userFoundLabels.has(group.label)
                  ? " connection-group--revealed"
                  : ""
              }`}
            >
              <strong>{group.label}</strong>
              <span>{group.items.join(" / ")}</span>
              {group.description ? <p>{group.description}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      {availableItems.length > 0 ? (
      <div className={`connection-board${boardShake ? " connection-board--shake" : ""}`}>
        {availableItems.map((item) => {
          const isSelected = selected.includes(item);

          return (
            <button
              key={item}
              type="button"
              className={`connection-tile ${isSelected ? "connection-tile--selected" : ""}`}
              disabled={isPending || locked}
              onClick={() => {
                setSelected((current) => {
                  if (current.includes(item)) {
                    return current.filter((value) => value !== item);
                  }

                  if (current.length >= maxSelection) {
                    return current;
                  }

                  return [...current, item];
                });
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
      ) : null}

      <div className="challenge-form__actions">
        <button
          className="button primary"
          type="button"
          disabled={isPending || locked || selected.length !== maxSelection}
          onClick={() => {
            setFeedback(null);

            startTransition(async () => {
              try {
                const result = await submitChallenge(challenge.id, {
                  selection: selected,
                });

                if (isRecord(result.attemptState)) {
                  const nextGroups = Array.isArray(result.attemptState.foundGroups)
                    ? (result.attemptState.foundGroups as ConnectionGroupState[])
                    : [];
                  const nextMistakes =
                    typeof result.attemptState.mistakes === "number"
                      ? result.attemptState.mistakes
                      : mistakes;

                  setFoundGroups(nextGroups);
                  setMistakes(nextMistakes);

                  if (result.status === "group-found") {
                    setUserFoundLabels((current) => {
                      const next = new Set(current);
                      nextGroups.forEach((group) => next.add(group.label));
                      return next;
                    });
                  }
                }

                if (result.status === "correct" || result.status === "locked") {
                  setLocked(true);
                }

                if (result.status === "incorrect") {
                  setBoardShake(true);
                  window.setTimeout(() => setBoardShake(false), 480);
                }

                if (result.revealedGroups?.length) {
                  setFoundGroups(result.revealedGroups);
                  setSolutionRevealed(true);
                  setRevealExplanation(result.explanation ?? challenge.explanation);
                }

                setSelected([]);
                setFeedback(result.message ?? "Seleção enviada.");

                if (result.status === "correct") {
                  router.refresh();
                }
              } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Erro ao validar o grupo.");
              }
            });
          }}
        >
          {locked ? "Tabuleiro encerrado" : isPending ? "Validando..." : "Testar grupo"}
        </button>

        <button
          className="button secondary"
          type="button"
          disabled={isPending || selected.length === 0}
          onClick={() => setSelected([])}
        >
          Limpar
        </button>

        <span className="muted">
          {mistakes}/{maxMistakes} erros
        </span>

        <span className="muted">
          {foundGroups.length}/
          {Math.max(foundGroups.length + availableItems.length / maxSelection, foundGroups.length)} grupos
        </span>
      </div>

      {solutionRevealed ? (
        <ChallengeRevealBanner
          label="Solução revelada"
          description={
            revealExplanation ??
            "Você atingiu o limite de erros. Os grupos corretos aparecem acima."
          }
        />
      ) : null}

      {feedback ? (
        <p
          className={
            feedback.toLowerCase().includes("boa") ||
            feedback.toLowerCase().includes("fechado")
              ? "success-banner"
              : "error-banner"
          }
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function SecurityChallengeForm({ challenge }: { challenge: DailyChallengeWithProgress }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSolved = challenge.progress?.isSolved ?? false;

  return (
    <form
      className="challenge-form"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        const form = event.currentTarget;

        const formData = new FormData(form);
        const answer = String(formData.get("answer") ?? "").trim();

        startTransition(async () => {
          try {
            const result = await submitChallenge(challenge.id, { answer });
            setFeedback(result.message ?? "Resposta enviada.");
            form.reset();

            if (result.status === "correct") {
              router.refresh();
            }
          } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Não foi possível enviar.");
          }
        });
      }}
    >
      <label className="field">
        <span>Sua resposta</span>
        <input
          type="text"
          name="answer"
          placeholder={isSolved ? "Desafio resolvido" : "Digite sua resposta"}
          disabled={isPending || isSolved}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>

      <div className="challenge-form__actions">
        <button className="button primary" type="submit" disabled={isPending || isSolved}>
          {isSolved ? "Resolvido" : isPending ? "Enviando..." : "Responder"}
        </button>

        {challenge.progress ? (
          <span className="muted">
            {challenge.progress.attemptsCount} tentativa
            {challenge.progress.attemptsCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {feedback ? (
        <p className={feedback.toLowerCase().includes("boa") ? "success-banner" : "error-banner"}>
          {feedback}
        </p>
      ) : null}
    </form>
  );
}

export function ChallengeAnswerForm({ challenge }: { challenge: DailyChallengeWithProgress }) {
  const payload = isRecord(challenge.payload) ? challenge.payload : {};

  if (challenge.category === "word" && payload.mode === "termo") {
    return <WordChallengeForm challenge={challenge} />;
  }

  if (challenge.category === "connection" && payload.mode === "conexo") {
    return <ConnectionChallengeForm challenge={challenge} />;
  }

  return <SecurityChallengeForm challenge={challenge} />;
}

