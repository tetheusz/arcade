"use client";

import { useMemo, useState } from "react";

export type MilestoneDraft = {
  id?: string;
  title: string;
  description: string;
  reputationReward: number;
  rewardUsdc: string;
};

type MissionMilestonesEditorProps = {
  name?: string;
  initialMilestones?: MilestoneDraft[];
};

function emptyMilestone(): MilestoneDraft {
  return {
    title: "",
    description: "",
    reputationReward: 0,
    rewardUsdc: "",
  };
}

export function MissionMilestonesEditor({
  name = "milestonesJson",
  initialMilestones = [],
}: MissionMilestonesEditorProps) {
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    initialMilestones.length > 0 ? initialMilestones : [emptyMilestone()],
  );

  const serialized = useMemo(() => JSON.stringify(milestones), [milestones]);

  const totals = useMemo(() => {
    const reputationReward = milestones.reduce(
      (sum, milestone) => sum + (Number(milestone.reputationReward) || 0),
      0,
    );
    const rewardUsdc = milestones.reduce((sum, milestone) => {
      const value = Number(milestone.rewardUsdc);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return {
      reputationReward,
      rewardUsdc: rewardUsdc > 0 ? rewardUsdc.toFixed(2) : "0",
    };
  }, [milestones]);

  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function removeMilestone(index: number) {
    setMilestones((current) => {
      if (current.length === 1) {
        return [emptyMilestone()];
      }
      return current.filter((_, entryIndex) => entryIndex !== index);
    });
  }

  return (
    <div className="stack-md">
      <div className="section-heading">
        <h2>Progressos / marcos</h2>
        <p className="muted">
          Defina etapas com XP e USDC. Ex.: publicar post (+10 XP, $2), 1k views (+3 XP, $2).
        </p>
      </div>

      {milestones.map((milestone, index) => (
        <article key={milestone.id ?? `milestone-${index}`} className="section-card stack-sm">
          <div className="bounty-card__header">
            <span className="panel-label">Marco {index + 1}</span>
            <button
              type="button"
              className="text-button danger"
              onClick={() => removeMilestone(index)}
            >
              Remover
            </button>
          </div>

          <label className="field">
            <span>Título do marco</span>
            <input
              value={milestone.title}
              onChange={(event) => updateMilestone(index, { title: event.target.value })}
              placeholder="Publicar post sobre o Arcade"
              required
            />
          </label>

          <label className="field">
            <span>Como validar</span>
            <textarea
              value={milestone.description}
              onChange={(event) => updateMilestone(index, { description: event.target.value })}
              rows={2}
              placeholder="Link do post publicado + menção ao Arcade"
            />
          </label>

          <div className="form-row">
            <label className="field">
              <span>XP</span>
              <input
                type="number"
                min={0}
                value={milestone.reputationReward}
                onChange={(event) =>
                  updateMilestone(index, {
                    reputationReward: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <label className="field">
              <span>USDC</span>
              <input
                value={milestone.rewardUsdc}
                onChange={(event) => updateMilestone(index, { rewardUsdc: event.target.value })}
                placeholder="2.00"
              />
            </label>
          </div>
        </article>
      ))}

      <button
        type="button"
        className="button secondary"
        onClick={() => setMilestones((current) => [...current, emptyMilestone()])}
      >
        Adicionar marco
      </button>

      <p className="muted">
        Total configurado: <strong>{totals.reputationReward} XP</strong>
        {Number(totals.rewardUsdc) > 0 ? (
          <>
            {" "}
            · <strong>{totals.rewardUsdc} USDC</strong> (escrow tentará ser criado ao salvar)
          </>
        ) : null}
      </p>

      <input type="hidden" name={name} value={serialized} readOnly />
    </div>
  );
}
