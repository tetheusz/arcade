"use server";

import { requireActionSession, actionResult, actionError, ActionError } from "@/lib/auth-guard";
import { getOrCreatePlayerProfile } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { isAddress } from "viem";

export async function syncSiweWalletProfileAction(walletAddress: string) {
  try {
    const session = await requireActionSession();
    const normalized = walletAddress.trim();

    if (!isAddress(normalized)) {
      return actionError("Endereço de carteira inválido.");
    }

    await getOrCreatePlayerProfile({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return actionError("Perfil não encontrado.");
    }

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        walletAddress: normalized,
        walletState: "ACTIVE",
      },
    });

    return actionResult({ walletAddress: normalized });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao vincular carteira ao perfil.");
  }
}
