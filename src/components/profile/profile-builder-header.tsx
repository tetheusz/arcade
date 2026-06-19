import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ARCHETYPES, archetypeLabel, getLevelInfo, type ArchetypeClass } from "@/lib/archetypes";
import { explorerAddressUrl } from "@/lib/arc/chain";
import { shortenAddress } from "@/lib/profile-display";
import type { ProfileLinks } from "@/lib/profile-display";

export type ProfileBuilderData = {
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string | null;
  skills: string[];
  region: string | null;
  links: ProfileLinks;
  walletAddress?: string | null;
  archetype?: ArchetypeClass | null;
  xp?: number;
  isOwner?: boolean;
};

type ProfileBuilderHeaderProps = {
  profile: ProfileBuilderData;
  stats?: {
    reputation: number;
    totalPoints: number;
    currentStreak: number;
    bounties: number;
  };
};

function formatLinkLabel(key: string, value: string) {
  if (key === "twitter" && value.startsWith("@")) {
    return value;
  }

  if (key === "twitter") {
    return `@${value.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "").replace(/\/$/, "")}`;
  }

  if (key === "github") {
    return value.includes("github.com")
      ? value.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "")
      : value;
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

function normalizeLinkHref(key: string, value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (key === "twitter") {
    const handle = value.replace(/^@/, "");
    return `https://x.com/${handle}`;
  }

  if (key === "github") {
    return `https://github.com/${value.replace(/^@/, "")}`;
  }

  return value;
}

export function ProfileBuilderHeader({ profile, stats }: ProfileBuilderHeaderProps) {
  const level = getLevelInfo(profile.xp ?? 0);
  const archetype = profile.archetype ? ARCHETYPES[profile.archetype] : null;
  const linkEntries = Object.entries(profile.links).filter(([, value]) => value?.trim());

  return (
    <section className="builder-profile">
      <div className="builder-profile__banner" aria-hidden="true" />

      <div className="builder-profile__body">
        <div className="builder-profile__identity">
          <div className="builder-profile__avatar-wrap">
            <ProfileAvatar src={profile.avatarUrl} size={112} />
            {archetype ? (
              <span
                className="builder-profile__archetype-dot"
                style={{ backgroundColor: archetype.color }}
                title={archetype.label}
              />
            ) : null}
          </div>

          <div className="builder-profile__meta">
            <p className="eyebrow">Builder card</p>
            <h1 className="builder-profile__name">{profile.displayName}</h1>
            <div className="builder-profile__handles">
              <span className="builder-profile__handle">@{profile.slug}</span>
              {profile.archetype ? (
                <span className="builder-profile__badge" style={{ color: archetype?.color }}>
                  {archetypeLabel(profile.archetype)} · Nível {level.level}
                </span>
              ) : null}
              {profile.region ? (
                <span className="builder-profile__region">{profile.region}</span>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="builder-profile__bio">{profile.bio}</p>
            ) : profile.isOwner ? (
              <p className="builder-profile__bio builder-profile__bio--placeholder">
                Adicione uma bio para contar sua história no ecossistema Arc.
              </p>
            ) : null}

            {profile.skills.length > 0 ? (
              <ul className="builder-profile__skills" aria-label="Habilidades">
                {profile.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : profile.isOwner ? (
              <p className="builder-profile__skills-empty muted">
                Adicione habilidades como Solidity, React, design…
              </p>
            ) : null}

            {linkEntries.length > 0 || profile.walletAddress ? (
              <div className="builder-profile__links">
                {linkEntries.map(([key, value]) =>
                  value ? (
                    <a
                      key={key}
                      className="builder-profile__link"
                      href={normalizeLinkHref(key, value)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formatLinkLabel(key, value)}
                    </a>
                  ) : null,
                )}
                {profile.walletAddress ? (
                  <a
                    className="builder-profile__link builder-profile__link--wallet"
                    href={explorerAddressUrl(profile.walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortenAddress(profile.walletAddress)}
                  </a>
                ) : null}
              </div>
            ) : null}

            {profile.isOwner ? (
              <div className="builder-profile__actions">
                <Link className="button secondary" href={`/players/${profile.slug}`}>
                  Ver perfil público
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {stats ? (
          <div className="builder-profile__stats">
            <article>
              <p>Reputação</p>
              <strong>{stats.reputation}</strong>
            </article>
            <article>
              <p>Pontos</p>
              <strong>{stats.totalPoints}</strong>
            </article>
            <article>
              <p>Streak</p>
              <strong>{stats.currentStreak}</strong>
            </article>
            <article>
              <p>Bounties</p>
              <strong>{stats.bounties}</strong>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
