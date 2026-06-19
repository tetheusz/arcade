export function isWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function formatSlugAsName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveDisplayName(input: {
  profileDisplayName?: string | null;
  userName: string;
  slug: string;
}) {
  if (input.profileDisplayName?.trim()) {
    return input.profileDisplayName.trim();
  }

  if (input.userName?.trim() && !isWalletAddress(input.userName)) {
    return input.userName.trim();
  }

  return formatSlugAsName(input.slug) || "Builder";
}

export function resolveAvatarUrl(input: {
  avatarUrl?: string | null;
  userImage?: string | null;
  seed: string;
}) {
  if (input.avatarUrl?.trim()) {
    return input.avatarUrl.trim();
  }

  if (input.userImage?.trim()) {
    return input.userImage.trim();
  }

  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(input.seed)}`;
}

export function profileSlugBase(userName: string, email: string) {
  if (isWalletAddress(userName)) {
    return `builder-${userName.slice(2, 8).toLowerCase()}`;
  }

  return userName || email.split("@")[0] || "builder";
}

export function headerUserLabel(displayName: string, slug: string) {
  const name = isWalletAddress(displayName) ? formatSlugAsName(slug) : displayName;
  return name.split(" ")[0] || "Perfil";
}

export function parseSkills(raw?: string | null) {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function serializeSkills(skills: string[]) {
  return skills
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(", ");
}

export type ProfileLinks = {
  twitter?: string;
  github?: string;
  website?: string;
  discord?: string;
};

export function parseProfileLinks(raw?: string | null): ProfileLinks {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ProfileLinks;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

export function serializeProfileLinks(links: ProfileLinks) {
  const cleaned = Object.fromEntries(
    Object.entries(links).filter(([, value]) => typeof value === "string" && value.trim()),
  );

  return JSON.stringify(cleaned);
}

export function shortenAddress(address: string) {
  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isManagedAvatarUrl(value: string) {
  return (
    value.startsWith("/uploads/profiles/avatars/") ||
    value.includes("/storage/v1/object/public/") && value.includes("/profiles/avatars/")
  );
}

export function isValidAvatarUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  const trimmed = value.trim();

  if (isManagedAvatarUrl(trimmed)) {
    return true;
  }

  return isValidHttpUrl(trimmed);
}

export function isValidProfileLink(value: string) {
  if (!value.trim()) {
    return true;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    return trimmed.length > 1 && trimmed.length <= 50;
  }

  return isValidHttpUrl(trimmed);
}
