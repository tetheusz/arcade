import { prisma } from "@/lib/prisma";

const BADGES = [
  { name: "Genesis Contributor", description: "Primeira bounty completada", icon: "🌱" },
  { name: "Reputation Pioneer", description: "100+ de reputação", icon: "⭐" },
  { name: "Arc Elite", description: "500+ de reputação", icon: "💎" },
  { name: "Junior Developer", description: "1 bounty Developer", icon: "👨‍💻" },
  { name: "Bug Hunter", description: "1 bounty Sentinel", icon: "🛡️" },
  { name: "Content Creator", description: "1 bounty Creator", icon: "✨" },
];

export async function seedBountyDomain() {
  for (const badge of BADGES) {
    await prisma.badgeDefinition.upsert({
      where: { name: badge.name },
      create: badge,
      update: badge,
    });
  }

  const arcadeProtocol = await prisma.protocol.upsert({
    where: { slug: "arcade" },
    create: {
      name: "Arcade",
      slug: "arcade",
      description:
        "Hub brasileiro de builders na Arc — journal, desafios e bounties em português.",
      website: process.env.ARCADE_PUBLIC_URL ?? "https://arcade-nu-blush.vercel.app",
      isVerified: true,
    },
    update: {},
  });

  const existingMissions = await prisma.mission.count({
    where: { protocolId: arcadeProtocol.id },
  });

  if (existingMissions === 0) {
    await prisma.mission.createMany({
      data: [
        {
          title: "Traduzir 1 página oficial da Arc",
          description:
            "Traduza uma página da documentação oficial (docs.arc.io) para PT-BR e publique no Journal.",
          requirements:
            "Tradução fiel, link da fonte, publicação via admin do Arcade.",
          category: "CREATOR",
          difficulty: "BEGINNER",
          reputationReward: 75,
          minReputation: 0,
          minStreak: 0,
          status: "PUBLISHED",
          protocolId: arcadeProtocol.id,
        },
        {
          title: "7 dias de desafio + post no X",
          description:
            "Mantenha streak de 7 dias nos desafios diários e publique um thread sobre o que aprendeu.",
          requirements: "Screenshot do streak + link do post.",
          category: "SCHOLAR",
          difficulty: "INTERMEDIATE",
          reputationReward: 100,
          minReputation: 50,
          minStreak: 3,
          status: "PUBLISHED",
          protocolId: arcadeProtocol.id,
        },
        {
          title: "Deploy de contrato na Arc Testnet",
          description:
            "Faça deploy de um contrato simples na Arc Testnet e compartilhe o endereço no explorer.",
          requirements: "Tx hash + endereço do contrato + breve README.",
          category: "DEVELOPER",
          difficulty: "ADVANCED",
          reputationReward: 150,
          rewardUsdc: "0.5",
          minReputation: 100,
          minStreak: 5,
          status: "PUBLISHED",
          escrowStatus: "NONE",
          protocolId: arcadeProtocol.id,
        },
      ],
    });
  }

  console.log("Bounty domain seeded:", arcadeProtocol.slug);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  seedBountyDomain()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
