import { parseUnits } from "viem";
import { prisma } from "@/lib/prisma";
import { USDC_DECIMALS } from "@/lib/arc/usdc";
import {
  adminWalletClient,
  createEscrowJob,
  fundEscrowJob,
} from "@/lib/onchain";

function getAdminAccountAddress() {
  if (!adminWalletClient) {
    return null;
  }

  return adminWalletClient.account.address;
}

export async function setupMissionEscrow(missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    select: {
      id: true,
      title: true,
      rewardUsdc: true,
      erc8183JobId: true,
      escrowStatus: true,
    },
  });

  if (!mission?.rewardUsdc) {
    return { success: false as const, error: "Bounty sem USDC configurado." };
  }

  const amount = Number(mission.rewardUsdc);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false as const, error: "Valor USDC inválido." };
  }

  if (!adminWalletClient) {
    return {
      success: false as const,
      error: "ADMIN_PRIVATE_KEY não configurada — escrow não criado.",
    };
  }

  if (mission.erc8183JobId && mission.escrowStatus === "FUNDED") {
    return { success: true as const, jobId: mission.erc8183JobId };
  }

  const adminAddress = getAdminAccountAddress();

  if (!adminAddress) {
    return { success: false as const, error: "Carteira admin indisponível." };
  }

  const budgetWei = parseUnits(mission.rewardUsdc, USDC_DECIMALS);
  const expiredAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;

  let jobId = mission.erc8183JobId;

  if (!jobId) {
    const created = await createEscrowJob({
      missionId: mission.id,
      providerAddress: adminAddress,
      evaluatorAddress: adminAddress,
      description: mission.title.slice(0, 120),
      expiredAt,
      budgetWei,
    });

    if (!created.success) {
      return created;
    }

    jobId = created.jobId ?? null;

    if (jobId) {
      await prisma.mission.update({
        where: { id: mission.id },
        data: { erc8183JobId: jobId },
      });
    }
  }

  if (!jobId) {
    return {
      success: false as const,
      error: "Escrow criado, mas jobId não foi registrado.",
    };
  }

  if (mission.escrowStatus !== "FUNDED") {
    const funded = await fundEscrowJob(jobId, budgetWei);

    if (!funded.success) {
      return funded;
    }

    await prisma.mission.update({
      where: { id: mission.id },
      data: { escrowStatus: "FUNDED" },
    });
  }

  return { success: true as const, jobId };
}
