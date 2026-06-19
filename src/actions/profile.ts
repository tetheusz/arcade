"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  requireActionSession,
  actionResult,
  actionError,
  ActionError,
} from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache";
import { PROFILE_LIMITS, trimField } from "@/lib/input-limits";
import {
  hasUploadedFile,
  removeManagedProfileAvatar,
  uploadProfileAvatar,
} from "@/lib/cover-storage";
import {
  isValidAvatarUrl,
  isValidProfileLink,
  parseSkills,
  serializeProfileLinks,
  serializeSkills,
  type ProfileLinks,
} from "@/lib/profile-display";

export async function updateProfileAction(formData: FormData) {
  try {
    const session = await requireActionSession();

    const displayName = trimField(String(formData.get("displayName") ?? ""), PROFILE_LIMITS.displayName);
    const bio = trimField(String(formData.get("bio") ?? ""), PROFILE_LIMITS.bio);
    let avatarUrl = trimField(String(formData.get("avatarUrl") ?? ""), PROFILE_LIMITS.avatarUrl);
    const region = trimField(String(formData.get("region") ?? ""), PROFILE_LIMITS.region);
    const skills = parseSkills(String(formData.get("skills") ?? ""))
      .map((skill) => trimField(skill, PROFILE_LIMITS.skill))
      .filter(Boolean);

    const links: ProfileLinks = {
      twitter: trimField(String(formData.get("twitter") ?? ""), PROFILE_LIMITS.link) || undefined,
      github: trimField(String(formData.get("github") ?? ""), PROFILE_LIMITS.link) || undefined,
      website: trimField(String(formData.get("website") ?? ""), PROFILE_LIMITS.link) || undefined,
      discord: trimField(String(formData.get("discord") ?? ""), PROFILE_LIMITS.link) || undefined,
    };

    const avatarFile = formData.get("avatarFile");

    if (hasUploadedFile(avatarFile)) {
      avatarUrl = await uploadProfileAvatar(avatarFile);
    }

    if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
      return actionError("URL da foto inválida. Use um link https:// ou envie um arquivo.");
    }

    for (const [key, value] of Object.entries(links)) {
      if (value && !isValidProfileLink(value)) {
        return actionError(`Link de ${key} inválido.`);
      }
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return actionError("Perfil não encontrado.");
    }

    const previousAvatarUrl = profile.avatarUrl;

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        displayName: displayName || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        skills: skills.length > 0 ? serializeSkills(skills) : null,
        region: region || null,
        links: serializeProfileLinks(links) === "{}" ? null : serializeProfileLinks(links),
      },
    });

    if (previousAvatarUrl && previousAvatarUrl !== (avatarUrl || null)) {
      await removeManagedProfileAvatar(previousAvatarUrl);
    }

    if (displayName && displayName !== session.user.name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: displayName },
      });
    }

    revalidatePath("/perfil");
    revalidatePath(`/players/${profile.slug}`);
    revalidateTag(CACHE_TAGS.leaderboard, "max");

    return actionResult({ ok: true });
  } catch (error) {
    if (error instanceof ActionError) {
      return actionError(error.message, error.code);
    }

    if (error instanceof Error) {
      return actionError(error.message);
    }

    return actionError("Não foi possível salvar o perfil.");
  }
}
