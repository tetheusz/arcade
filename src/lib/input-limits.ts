const ARCHETYPE_VALUES = [
  "DEVELOPER",
  "SENTINEL",
  "CREATOR",
  "SCHOLAR",
  "ARCHITECT",
] as const;

export function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function trimField(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export function isValidArchetype(value: string) {
  return ARCHETYPE_VALUES.includes(value as (typeof ARCHETYPE_VALUES)[number]);
}

export const SUBMISSION_LIMITS = {
  title: 200,
  evidence: 10_000,
  links: 2_000,
} as const;

export const REVIEW_LIMITS = {
  feedback: 5_000,
  scoreMin: 1,
  scoreMax: 10,
  rewardMax: 10_000,
} as const;

export const PROFILE_LIMITS = {
  displayName: 80,
  bio: 500,
  avatarUrl: 500,
  region: 80,
  skill: 40,
  maxSkills: 12,
  link: 300,
} as const;
