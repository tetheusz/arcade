import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    },
  },
});

async function wipeDatabase() {
  const isPostgres = process.env.DATABASE_URL?.includes("postgres");

  if (isPostgres) {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "challenge_attempts",
        "milestone_claims",
        "payouts",
        "reviews",
        "submissions",
        "mission_milestones",
        "on_chain_proofs",
        "reputation_events",
        "user_badges",
        "wallet_ledger",
        "activity_events",
        "activity_snapshots",
        "daily_challenges",
        "posts",
        "missions",
        "protocol_admins",
        "protocol_applications",
        "wallet_addresses",
        "user_profiles",
        "sessions",
        "accounts",
        "verifications",
        "users",
        "protocols",
        "badge_definitions"
      RESTART IDENTITY CASCADE
    `);
    return;
  }

  await prisma.challengeAttempt.deleteMany();
  await prisma.milestoneClaim.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.review.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.missionMilestone.deleteMany();
  await prisma.onChainProof.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.activitySnapshot.deleteMany();
  await prisma.dailyChallenge.deleteMany();
  await prisma.post.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.protocolAdmin.deleteMany();
  await prisma.protocolApplication.deleteMany();
  await prisma.walletAddress.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.protocol.deleteMany();
  await prisma.badgeDefinition.deleteMany();
}

async function reseed() {
  const { seedFoundation } = await import("../prisma/seed");
  await seedFoundation({ forceAdmin: true });
}

async function main() {
  const confirmed = process.argv.includes("--confirm");

  if (!confirmed) {
    console.error(
      JSON.stringify(
        {
          status: "blocked",
          message:
            "Operacao destrutiva. Rode com --confirm para apagar todos os registros e re-seedar admin + bounties.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  console.log("Apagando todos os registros...");
  await wipeDatabase();

  console.log("Re-seedando admin, badges e bounties...");
  await reseed();

  console.log(
    JSON.stringify(
      {
        status: "reset-complete",
        message:
          "Banco zerado. Admin e dominio de bounties recriados. Conteudo editorial vem do cron (traducoes + desafios) ou dos scripts editorial:cycle / posts:translate-next / challenges:generate-next.",
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
