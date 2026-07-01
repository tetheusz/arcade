"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireActionSession,
  requireActionAdmin,
  requireReviewerOrAdmin,
  actionResult,
  actionError,
  ActionError,
} from "@/lib/auth-guard";
import {
  canUserApplyToMission,
  type CreateMissionInput,
  type UpdateMissionInput,
} from "@/lib/bounties";
import { syncMissionMilestones, sumMilestoneRewards } from "@/lib/bounties/milestones";
import { transferUsdcToAddress } from "@/lib/arc/usdc";
import { checkAndAwardBadges } from "@/lib/achievements";
import {
  clampInt,
  isValidArchetype,
  REVIEW_LIMITS,
  SUBMISSION_LIMITS,
  trimField,
} from "@/lib/input-limits";
import {
  completeEscrowJob,
  hashDeliverable,
  submitEscrowDeliverable,
} from "@/lib/onchain";
import { CACHE_TAGS } from "@/lib/cache";

export async function createMissionAction(input: CreateMissionInput) {
  try {
    await requireActionAdmin();

    const title = trimField(input.title, 200);
    const description = trimField(input.description, 8_000);
    const requirements = trimField(input.requirements, 4_000);

    if (!title || !description || !input.protocolId) {
      return actionError("Título, descrição e protocolo são obrigatórios.");
    }

    const { milestones, ...missionInput } = input;
    const milestoneTotals = milestones?.length ? sumMilestoneRewards(milestones) : null;

    const mission = await prisma.mission.create({
      data: {
        title,
        description,
        requirements,
        category: missionInput.category,
        difficulty: missionInput.difficulty,
        protocolId: missionInput.protocolId,
        minReputation: clampInt(missionInput.minReputation ?? 0, 0, 10_000),
        minStreak: clampInt(missionInput.minStreak ?? 0, 0, 365),
        deadline: missionInput.deadline,
        status: missionInput.status ?? "PUBLISHED",
        reputationReward: milestoneTotals
          ? milestoneTotals.reputationReward
          : clampInt(missionInput.reputationReward, 0, 10_000),
        rewardUsdc: milestoneTotals?.rewardUsdc ?? missionInput.rewardUsdc ?? null,
      },
    });

    if (milestones?.length) {
      await syncMissionMilestones(mission.id, milestones);
    }

    revalidatePath("/bounties");
    revalidatePath("/admin/bounties");
    revalidateTag(CACHE_TAGS.missions, "max");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult(mission);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao criar missão.");
  }
}

export async function updateMissionAction(missionId: string, input: UpdateMissionInput) {
  try {
    await requireActionAdmin();

    const existing = await prisma.mission.findUnique({ where: { id: missionId } });

    if (!existing) {
      return actionError("Bounty não encontrada.", "NOT_FOUND");
    }

    const title = input.title !== undefined ? trimField(input.title, 200) : undefined;
    const description =
      input.description !== undefined ? trimField(input.description, 8_000) : undefined;
    const requirements =
      input.requirements !== undefined ? trimField(input.requirements, 4_000) : undefined;

    if (title === "" || description === "" || requirements === "") {
      return actionError("Título, descrição e requisitos não podem ficar vazios.");
    }

    if (input.protocolId) {
      const protocol = await prisma.protocol.findUnique({ where: { id: input.protocolId } });
      if (!protocol) {
        return actionError("Protocolo não encontrado.");
      }
    }

    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(requirements !== undefined ? { requirements } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.reputationReward !== undefined && input.milestones === undefined
          ? { reputationReward: clampInt(input.reputationReward, 0, 10_000) }
          : {}),
        ...(input.rewardUsdc !== undefined && input.milestones === undefined
          ? { rewardUsdc: input.rewardUsdc || null }
          : {}),
        ...(input.minReputation !== undefined
          ? { minReputation: clampInt(input.minReputation, 0, 10_000) }
          : {}),
        ...(input.minStreak !== undefined
          ? { minStreak: clampInt(input.minStreak, 0, 365) }
          : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
        ...(input.protocolId !== undefined ? { protocolId: input.protocolId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    if (input.milestones !== undefined) {
      await syncMissionMilestones(missionId, input.milestones);
    }

    revalidatePath("/bounties");
    revalidatePath("/admin/bounties");
    revalidatePath(`/bounties/${missionId}`);
    revalidatePath(`/admin/bounties/${missionId}/edit`);
    revalidateTag(CACHE_TAGS.missions, "max");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult(mission);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao atualizar bounty.");
  }
}

export async function deleteMissionAction(missionId: string) {
  try {
    await requireActionAdmin();

    const existing = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true, escrowStatus: true },
    });

    if (!existing) {
      return actionError("Bounty não encontrada.", "NOT_FOUND");
    }

    if (existing.escrowStatus === "FUNDED" || existing.escrowStatus === "OPEN") {
      return actionError(
        "Não é possível excluir uma bounty com escrow aberto ou financiado. Arquive-a em vez disso.",
      );
    }

    await prisma.mission.delete({ where: { id: missionId } });

    revalidatePath("/bounties");
    revalidatePath("/admin/bounties");
    revalidateTag(CACHE_TAGS.missions, "max");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult({ deleted: missionId });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao excluir bounty.");
  }
}

export async function submitMissionAction(data: {
  missionId: string;
  title: string;
  evidence: string;
  links?: string;
}) {
  try {
    const session = await requireActionSession();
    const check = await canUserApplyToMission(session.user.id, data.missionId);

    if (!check.allowed) {
      return actionError(check.reason ?? "Não autorizado.");
    }

    const title = trimField(data.title, SUBMISSION_LIMITS.title);
    const evidence = trimField(data.evidence, SUBMISSION_LIMITS.evidence);
    const links = trimField(data.links ?? "", SUBMISSION_LIMITS.links);

    if (!title || !evidence) {
      return actionError("Título e evidência são obrigatórios.");
    }

    const submission = await prisma.submission.create({
      data: {
        missionId: data.missionId,
        userId: session.user.id,
        title,
        evidence,
        links,
        status: "PENDING",
      },
    });

    revalidatePath(`/bounties/${data.missionId}`);
    revalidatePath("/dashboard");
    revalidateTag(CACHE_TAGS.missions, "max");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult(submission);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao submeter.");
  }
}

export async function reviewSubmissionAction(
  submissionId: string,
  data: {
    status: "APPROVED" | "REJECTED";
    feedback: string;
    qualityScore: number;
    impactScore: number;
    rewardGranted?: number;
  },
) {
  try {
    const session = await requireActionSession();

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { mission: true },
    });

    if (!submission) return actionError("Submissão não encontrada.", "NOT_FOUND");

    if (submission.status !== "PENDING") {
      return actionError("Esta submissão já foi revisada.");
    }

    const existingReview = await prisma.review.findFirst({
      where: { submissionId },
      select: { id: true },
    });

    if (existingReview) {
      return actionError("Esta submissão já possui revisão.");
    }

    await requireReviewerOrAdmin(session.user.id, submission.mission.protocolId);

    const feedback = trimField(data.feedback, REVIEW_LIMITS.feedback);
    const qualityScore = clampInt(
      data.qualityScore,
      REVIEW_LIMITS.scoreMin,
      REVIEW_LIMITS.scoreMax,
    );
    const impactScore = clampInt(
      data.impactScore,
      REVIEW_LIMITS.scoreMin,
      REVIEW_LIMITS.scoreMax,
    );
    const rewardGranted =
      data.rewardGranted === undefined
        ? undefined
        : clampInt(data.rewardGranted, 0, REVIEW_LIMITS.rewardMax);

    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          submissionId,
          reviewerId: session.user.id,
          feedback,
          qualityScore,
          impactScore,
        },
      });

      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: data.status,
          rewardGranted,
        },
      });

      if (data.status === "APPROVED" && data.rewardGranted) {
        await tx.userProfile.update({
          where: { userId: submission.userId },
          data: {
            reputationScore: { increment: data.rewardGranted },
            xp: { increment: data.rewardGranted },
          },
        });

        await tx.reputationEvent.create({
          data: {
            userId: submission.userId,
            amount: data.rewardGranted,
            description: `Bounty: ${submission.mission.title}`,
            category: submission.mission.category,
          },
        });
      }
    });

    if (data.status === "APPROVED") {
      const mission = submission.mission;

      if (mission.rewardUsdc) {
        const profile = await prisma.userProfile.findUnique({
          where: { userId: submission.userId },
          select: { walletAddress: true, usdcEarned: true },
        });

        const walletAddress = profile?.walletAddress;
        let payoutTxHash: string | null = null;
        let payoutStatus: "COMPLETED" | "PENDING" = "PENDING";

        if (!walletAddress) {
          return actionError(
            "Usuário não tem carteira ativa no perfil. Peça para provisionar a wallet antes de aprovar USDC.",
          );
        }

        const transfer = await transferUsdcToAddress(walletAddress, mission.rewardUsdc);

        if (transfer.success) {
          payoutTxHash = transfer.txHash;
          payoutStatus = "COMPLETED";
        } else {
          const { adminWalletClient } = await import("@/lib/onchain");

          if (adminWalletClient) {
            return actionError(
              `Pagamento USDC falhou: ${transfer.error}. Verifique saldo USDC da carteira admin e tente de novo.`,
            );
          }
        }

        await prisma.$transaction(async (tx) => {
          const payout = await tx.payout.create({
            data: {
              missionId: mission.id,
              userId: submission.userId,
              amount: mission.rewardUsdc!,
              txHash: payoutTxHash,
              status: payoutStatus,
            },
          });

          if (payoutStatus === "COMPLETED") {
            const current = Number(profile?.usdcEarned ?? 0);
            const earned = Number.isFinite(current)
              ? current + Number(mission.rewardUsdc)
              : Number(mission.rewardUsdc);

            await tx.userProfile.update({
              where: { userId: submission.userId },
              data: { usdcEarned: earned.toFixed(2) },
            });

            await tx.walletLedger.create({
              data: {
                userId: submission.userId,
                type: "BOUNTY_PAYOUT",
                amount: mission.rewardUsdc!,
                txHash: payoutTxHash,
                metadata: {
                  missionId: mission.id,
                  submissionId: submission.id,
                  payoutId: payout.id,
                },
              },
            });
          }
        });

        if (
          mission.erc8183JobId &&
          mission.escrowStatus === "FUNDED"
        ) {
          const deliverableContent = `${submission.title ?? ""}:${submission.evidence}`;
          await submitEscrowDeliverable(mission.erc8183JobId, deliverableContent);
          const complete = await completeEscrowJob(mission.erc8183JobId);

          if (complete.success) {
            await prisma.mission.update({
              where: { id: mission.id },
              data: {
                escrowStatus: "COMPLETED",
                deliverableHash: hashDeliverable(deliverableContent),
              },
            });
          }
        }
      }

      await checkAndAwardBadges(submission.userId);
    }

    revalidatePath("/admin/bounties/reviews");
    revalidatePath(`/bounties/${submission.missionId}`);
    revalidateTag(CACHE_TAGS.missions, "max");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult({ submissionId });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha na revisão.");
  }
}

export async function claimMilestoneAction(milestoneId: string, evidence: string) {
  try {
    const session = await requireActionSession();
    const proof = trimField(evidence, SUBMISSION_LIMITS.evidence);

    if (!proof) {
      return actionError("Envie um link ou evidência para validar este progresso.");
    }

    const milestone = await prisma.missionMilestone.findUnique({
      where: { id: milestoneId },
      include: { mission: { select: { id: true, status: true } } },
    });

    if (!milestone || milestone.mission.status !== "PUBLISHED") {
      return actionError("Marco indisponível.");
    }

    const existing = await prisma.milestoneClaim.findUnique({
      where: {
        milestoneId_userId: {
          milestoneId,
          userId: session.user.id,
        },
      },
    });

    if (existing?.status === "APPROVED") {
      return actionError("Você já concluiu este marco.");
    }

    if (existing?.status === "PENDING") {
      return actionError("Sua evidência já está em revisão.");
    }

    const claim = existing
      ? await prisma.milestoneClaim.update({
          where: { id: existing.id },
          data: {
            evidence: proof,
            status: "PENDING",
            reviewerId: null,
            reviewedAt: null,
          },
        })
      : await prisma.milestoneClaim.create({
          data: {
            milestoneId,
            userId: session.user.id,
            evidence: proof,
          },
        });

    revalidatePath(`/bounties/${milestone.mission.id}`);
    revalidatePath("/admin/bounties/reviews");
    return actionResult(claim);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao enviar evidência do marco.");
  }
}

export async function reviewMilestoneClaimAction(
  claimId: string,
  status: "APPROVED" | "REJECTED",
) {
  try {
    const session = await requireActionSession();

    const claim = await prisma.milestoneClaim.findUnique({
      where: { id: claimId },
      include: {
        milestone: {
          include: {
            mission: {
              select: { id: true, protocolId: true, title: true, category: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            profile: { select: { walletAddress: true, usdcEarned: true } },
          },
        },
      },
    });

    if (!claim) {
      return actionError("Marco não encontrado.", "NOT_FOUND");
    }

    if (claim.status !== "PENDING") {
      return actionError("Este marco já foi revisado.");
    }

    await requireReviewerOrAdmin(session.user.id, claim.milestone.mission.protocolId);

    if (status === "REJECTED") {
      await prisma.milestoneClaim.update({
        where: { id: claimId },
        data: {
          status: "REJECTED",
          reviewerId: session.user.id,
          reviewedAt: new Date(),
        },
      });

      revalidatePath("/admin/bounties/reviews");
      revalidatePath(`/bounties/${claim.milestone.mission.id}`);
      return actionResult({ claimId, status });
    }

    const { milestone } = claim;
    let payoutTxHash: string | null = null;
    let payoutStatus: "COMPLETED" | "PENDING" = "PENDING";
    let transferError: string | null = null;

    if (milestone.rewardUsdc) {
      const walletAddress = claim.user.profile?.walletAddress;

      if (!walletAddress) {
        return actionError(
          "Usuário não tem carteira ativa no perfil. Peça para provisionar a wallet antes de aprovar USDC.",
        );
      }

      const transfer = await transferUsdcToAddress(walletAddress, milestone.rewardUsdc);

      if (transfer.success) {
        payoutTxHash = transfer.txHash;
        payoutStatus = "COMPLETED";
      } else {
        transferError = transfer.error;
        const { adminWalletClient } = await import("@/lib/onchain");

        if (adminWalletClient) {
          return actionError(
            `Pagamento USDC falhou: ${transfer.error}. Verifique saldo USDC da carteira admin e tente de novo.`,
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.milestoneClaim.update({
        where: { id: claimId },
        data: {
          status: "APPROVED",
          reviewerId: session.user.id,
          reviewedAt: new Date(),
        },
      });

      if (milestone.reputationReward > 0) {
        await tx.userProfile.update({
          where: { userId: claim.userId },
          data: {
            reputationScore: { increment: milestone.reputationReward },
            xp: { increment: milestone.reputationReward },
          },
        });

        await tx.reputationEvent.create({
          data: {
            userId: claim.userId,
            amount: milestone.reputationReward,
            description: `Marco: ${milestone.title} (${claim.milestone.mission.title})`,
            category: claim.milestone.mission.category,
          },
        });
      }

      if (milestone.rewardUsdc) {
        const payout = await tx.payout.create({
          data: {
            missionId: claim.milestone.mission.id,
            userId: claim.userId,
            milestoneClaimId: claimId,
            amount: milestone.rewardUsdc,
            txHash: payoutTxHash,
            status: payoutStatus,
          },
        });

        if (payoutStatus === "COMPLETED") {
          const current = Number(claim.user.profile?.usdcEarned ?? 0);
          const earned = Number.isFinite(current)
            ? current + Number(milestone.rewardUsdc)
            : Number(milestone.rewardUsdc);

          await tx.userProfile.update({
            where: { userId: claim.userId },
            data: { usdcEarned: earned.toFixed(2) },
          });

          await tx.walletLedger.create({
            data: {
              userId: claim.userId,
              type: "MILESTONE_PAYOUT",
              amount: milestone.rewardUsdc,
              txHash: payoutTxHash,
              metadata: {
                missionId: claim.milestone.mission.id,
                milestoneId: milestone.id,
                payoutId: payout.id,
              },
            },
          });
        }
      }
    });

    await checkAndAwardBadges(claim.userId);

    revalidatePath("/admin/bounties/reviews");
    revalidatePath(`/bounties/${claim.milestone.mission.id}`);
    revalidatePath("/perfil");
    revalidateTag(CACHE_TAGS.leaderboard, "max");
    return actionResult({ claimId, status, payoutTxHash, transferError });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao revisar marco.");
  }
}

export async function retryMilestonePayoutAction(payoutId: string) {
  try {
    await requireActionAdmin();

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        user: { select: { profile: { select: { walletAddress: true, usdcEarned: true } } } },
        milestoneClaim: {
          include: {
            milestone: { select: { rewardUsdc: true, title: true } },
          },
        },
      },
    });

    if (!payout || payout.status !== "PENDING" || !payout.milestoneClaim) {
      return actionError("Payout pendente não encontrado.");
    }

    const walletAddress = payout.user.profile?.walletAddress;
    const amount = payout.milestoneClaim.milestone.rewardUsdc ?? payout.amount;

    if (!walletAddress) {
      return actionError("Usuário sem carteira ativa.");
    }

    const transfer = await transferUsdcToAddress(walletAddress, amount);

    if (!transfer.success) {
      return actionError(`Transferência falhou: ${transfer.error}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: { status: "COMPLETED", txHash: transfer.txHash },
      });

      const current = Number(payout.user.profile?.usdcEarned ?? 0);
      const earned = Number.isFinite(current) ? current + Number(amount) : Number(amount);

      await tx.userProfile.update({
        where: { userId: payout.userId },
        data: { usdcEarned: earned.toFixed(2) },
      });

      await tx.walletLedger.create({
        data: {
          userId: payout.userId,
          type: "MILESTONE_PAYOUT",
          amount,
          txHash: transfer.txHash,
          metadata: { payoutId, retried: true },
        },
      });
    });

    revalidatePath("/admin/bounties/reviews");
    revalidatePath("/perfil");
    return actionResult({ payoutId, txHash: transfer.txHash });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao reenviar payout.");
  }
}

export async function setArchetypeAction(archetype: string) {
  try {
    const session = await requireActionSession();

    if (!isValidArchetype(archetype)) {
      return actionError("Arquétipo inválido.");
    }

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: { chosenArchetype: archetype as never },
    });

    revalidatePath("/perfil");
    return actionResult({ archetype });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao definir arquétipo.");
  }
}

export async function provisionWalletAction() {
  try {
    const session = await requireActionSession();
    const { provisionCircleWallet } = await import("@/lib/circle/wallets");
    const wallet = await provisionCircleWallet(session.user.id, session.user.name);
    revalidatePath("/perfil");
    return actionResult(wallet);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao provisionar carteira.");
  }
}
