import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { headerUserLabel, resolveDisplayName } from "@/lib/profile-display";

export const getHeaderProfileLabel = cache(async (userId: string, userName: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { displayName: true, slug: true },
  });

  if (!profile) {
    return userName.split(" ")[0] || "Perfil";
  }

  return headerUserLabel(
    resolveDisplayName({
      profileDisplayName: profile.displayName,
      userName,
      slug: profile.slug,
    }),
    profile.slug,
  );
});
