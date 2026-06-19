export type ArchetypeClass =
  | "DEVELOPER"
  | "SENTINEL"
  | "CREATOR"
  | "SCHOLAR"
  | "ARCHITECT";

export const ARCHETYPES: Record<
  ArchetypeClass,
  { label: string; category: string; color: string; description: string }
> = {
  DEVELOPER: {
    label: "Developer",
    category: "TECHNICAL",
    color: "#00E5FF",
    description: "Contratos, deploys e integrações na Arc.",
  },
  SENTINEL: {
    label: "Sentinel",
    category: "QA_TESTING",
    color: "#a855f7",
    description: "Segurança, testes e auditoria de código.",
  },
  CREATOR: {
    label: "Creator",
    category: "CONTENT_CREATION",
    color: "#f59e0b",
    description: "Conteúdo, traduções e divulgação do ecossistema.",
  },
  SCHOLAR: {
    label: "Scholar",
    category: "RESEARCH",
    color: "#3b82f6",
    description: "Pesquisa, documentação e análise técnica.",
  },
  ARCHITECT: {
    label: "Architect",
    category: "PROTOCOL",
    color: "#10b981",
    description: "Design de protocolos e arquitetura de sistemas.",
  },
};

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 1950, 2950, 4450, 6450];

export function getLevelInfo(totalXP: number) {
  let level = 1;
  let nextThreshold = LEVEL_THRESHOLDS[1] ?? 50;
  let currentThreshold = 0;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]!) {
      level = i + 1;
      currentThreshold = LEVEL_THRESHOLDS[i]!;
      nextThreshold = LEVEL_THRESHOLDS[i + 1] ?? LEVEL_THRESHOLDS[i]! * 2;
    } else {
      break;
    }
  }

  const progress =
    level >= LEVEL_THRESHOLDS.length
      ? 100
      : ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return { level, progress, currentThreshold, nextThreshold, isMax: level >= LEVEL_THRESHOLDS.length };
}

export function archetypeLabel(archetype: ArchetypeClass | null | undefined) {
  if (!archetype) return null;
  return ARCHETYPES[archetype]?.label ?? archetype;
}
