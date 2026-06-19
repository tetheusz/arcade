import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { prisma } from "@/lib/prisma";

function isCircleConfigured() {
  return Boolean(process.env.CIRCLE_API_KEY && process.env.CIRCLE_ENTITY_SECRET);
}

function getCircleClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    return null;
  }

  return initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
}

async function provisionMockWallet(userId: string, reason?: string) {
  const mockAddress = `0x${userId.replace(/-/g, "").slice(0, 40).padEnd(40, "0")}`;

  await prisma.userProfile.update({
    where: { userId },
    data: {
      walletId: `mock-${userId}`,
      walletAddress: mockAddress,
      walletState: "ACTIVE",
    },
  });

  if (reason) {
    console.warn(`[Circle] Usando carteira mock: ${reason}`);
  }

  return {
    walletId: `mock-${userId}`,
    address: mockAddress,
    state: "ACTIVE" as const,
    mock: true,
  };
}

export async function provisionCircleWallet(userId: string, userName: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  if (profile?.walletAddress && profile.walletState === "ACTIVE") {
    return {
      walletId: profile.walletId,
      address: profile.walletAddress,
      state: profile.walletState,
    };
  }

  if (!isCircleConfigured()) {
    return provisionMockWallet(userId);
  }

  const client = getCircleClient();
  if (!client) {
    return provisionMockWallet(userId, "cliente Circle indisponível");
  }

  try {
    const walletSetName = `Arcade-${userId.slice(0, 8)}`;

    const walletSetRes = await client.createWalletSet({
      name: walletSetName,
    });

    const walletSetId = walletSetRes.data?.walletSet?.id;
    if (!walletSetId) {
      throw new Error("Falha ao criar wallet set.");
    }

    const walletsRes = await client.createWallets({
      blockchains: ["ARC-TESTNET"],
      count: 1,
      walletSetId,
      accountType: "SCA",
    });

    const wallet = walletsRes.data?.wallets?.[0];
    if (!wallet?.address) {
      throw new Error("Falha ao criar wallet.");
    }

    await prisma.userProfile.update({
      where: { userId },
      data: {
        walletId: wallet.id,
        walletAddress: wallet.address,
        walletState: "ACTIVE",
      },
    });

    await prisma.walletLedger.create({
      data: {
        userId,
        type: "WALLET_PROVISIONED",
        metadata: { walletId: wallet.id, name: userName, provider: "circle" },
      },
    });

    return {
      walletId: wallet.id,
      address: wallet.address,
      state: "ACTIVE" as const,
      mock: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Circle] Wallet provisioning failed:", message);

    if (process.env.NODE_ENV !== "production") {
      return provisionMockWallet(userId, message);
    }

    await prisma.userProfile.update({
      where: { userId },
      data: { walletState: "FAILED" },
    });

    throw error;
  }
}

export async function getWalletForUser(userId: string) {
  return prisma.userProfile.findUnique({
    where: { userId },
    select: {
      walletId: true,
      walletAddress: true,
      walletState: true,
      usdcEarned: true,
    },
  });
}
