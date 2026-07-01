import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { transferUsdcToAddress } from "@/lib/arc/usdc";

const prisma = new PrismaClient();

async function main() {
  const submissionId = process.argv[2];

  const submission = submissionId
    ? await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          mission: { select: { id: true, title: true, rewardUsdc: true } },
          user: {
            select: {
              id: true,
              profile: { select: { walletAddress: true, usdcEarned: true } },
            },
          },
        },
      })
    : await prisma.submission.findFirst({
        where: {
          status: "APPROVED",
          mission: { rewardUsdc: { not: null } },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          mission: { select: { id: true, title: true, rewardUsdc: true } },
          user: {
            select: {
              id: true,
              profile: { select: { walletAddress: true, usdcEarned: true } },
            },
          },
        },
      });

  if (!submission?.mission.rewardUsdc) {
    throw new Error("Submissão aprovada com USDC não encontrada.");
  }

  const existingPayout = await prisma.payout.findFirst({
    where: {
      missionId: submission.mission.id,
      userId: submission.userId,
      milestoneClaimId: null,
      status: "COMPLETED",
    },
  });

  if (existingPayout) {
    console.log(JSON.stringify({ status: "already_paid", payout: existingPayout }, null, 2));
    return;
  }

  const walletAddress = submission.user.profile?.walletAddress;

  if (!walletAddress) {
    throw new Error("Usuário sem carteira ativa.");
  }

  const amount = submission.mission.rewardUsdc;
  const transfer = await transferUsdcToAddress(walletAddress, amount);

  if (!transfer.success) {
    throw new Error(transfer.error);
  }

  const profile = submission.user.profile;
  const current = Number(profile?.usdcEarned ?? 0);
  const earned = Number.isFinite(current) ? current + Number(amount) : Number(amount);

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.payout.create({
      data: {
        missionId: submission.mission.id,
        userId: submission.userId,
        amount,
        txHash: transfer.txHash,
        status: "COMPLETED",
      },
    });

    await tx.userProfile.update({
      where: { userId: submission.userId },
      data: { usdcEarned: earned.toFixed(2) },
    });

    await tx.walletLedger.create({
      data: {
        userId: submission.userId,
        type: "BOUNTY_PAYOUT",
        amount,
        txHash: transfer.txHash,
        metadata: {
          missionId: submission.mission.id,
          submissionId: submission.id,
          payoutId: created.id,
          retried: true,
        },
      },
    });

    return created;
  });

  console.log(
    JSON.stringify(
      {
        status: "paid",
        mission: submission.mission.title,
        amount,
        walletAddress,
        txHash: transfer.txHash,
        payoutId: payout.id,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
