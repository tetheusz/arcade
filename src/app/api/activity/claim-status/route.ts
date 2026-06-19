import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/auth";
import { getSnapshotForDate } from "@/lib/onchain/snapshot";
import { getDateKey, shiftDateKey } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getRouteSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = shiftDateKey(getDateKey(), -1);
  const snapshot = await getSnapshotForDate(yesterday);
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    dateKey: yesterday,
    snapshot,
    canClaim: Boolean(snapshot?.merkleRoot && profile?.walletAddress),
    walletAddress: profile?.walletAddress,
    explorerBase: "https://testnet.arcscan.app",
  });
}
