import { NextResponse } from "next/server";
import { getUsdcBalance } from "@/lib/arc/usdc";
import { getRouteSession } from "@/lib/auth";
import { getWalletForUser } from "@/lib/circle/wallets";

export async function GET() {
  const session = await getRouteSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const wallet = await getWalletForUser(session.user.id);

  if (!wallet?.walletAddress || wallet.walletState !== "ACTIVE") {
    return NextResponse.json({ balance: "0" });
  }

  const balance = await getUsdcBalance(wallet.walletAddress);

  return NextResponse.json({ balance });
}
