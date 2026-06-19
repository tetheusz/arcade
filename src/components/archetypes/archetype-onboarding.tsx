"use client";

import { useTransition } from "react";
import { setArchetypeAction } from "@/actions/bounties";
import { ARCHETYPES, type ArchetypeClass } from "@/lib/archetypes";

type ArchetypeOnboardingProps = {
  currentArchetype: ArchetypeClass | null;
};

export function ArchetypeOnboarding({ currentArchetype }: ArchetypeOnboardingProps) {
  const [pending, startTransition] = useTransition();

  if (currentArchetype) {
    const config = ARCHETYPES[currentArchetype];
    return (
      <article className="section-card archetype-card">
        <p className="eyebrow">Arquétipo</p>
        <h2 style={{ color: config.color }}>{config.label}</h2>
        <p className="muted">{config.description}</p>
      </article>
    );
  }

  function select(archetype: ArchetypeClass) {
    startTransition(async () => {
      await setArchetypeAction(archetype);
      window.location.reload();
    });
  }

  return (
    <article className="section-card archetype-card">
      <div className="section-heading section-heading--stacked">
        <p className="eyebrow">Onboarding</p>
        <h2>Escolha seu arquétipo</h2>
        <p className="muted">Define sua trilha de bounties e badges no ecossistema Arc.</p>
      </div>
      <div className="archetype-grid">
        {(Object.keys(ARCHETYPES) as ArchetypeClass[]).map((key) => {
          const config = ARCHETYPES[key];
          return (
            <button
              key={key}
              type="button"
              className="archetype-option"
              disabled={pending}
              onClick={() => select(key)}
              style={{ borderColor: config.color }}
            >
              <strong style={{ color: config.color }}>{config.label}</strong>
              <span className="muted">{config.description}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
