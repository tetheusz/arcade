import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { arcTestnet, USDC_ADDRESS } from "@/lib/arc/chain";

/** ERC-20 USDC on Arc uses 6 decimals (native gas uses 18 — do not mix). */
export const USDC_DECIMALS = 6;

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

export async function getUsdcBalance(address: string): Promise<string> {
  if (!address || !address.startsWith("0x")) {
    return "0";
  }

  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });

    return formatUnits(balance, USDC_DECIMALS);
  } catch {
    return "0";
  }
}

export async function getAdminUsdcBalance(): Promise<string> {
  const { adminWalletClient } = await import("@/lib/onchain");
  if (!adminWalletClient) return "0";
  return getUsdcBalance(adminWalletClient.account.address);
}

export async function transferUsdcToAddress(
  toAddress: string,
  amount: string,
): Promise<{ success: true; txHash: string } | { success: false; error: string }> {
  const { adminWalletClient } = await import("@/lib/onchain");

  if (!adminWalletClient) {
    return { success: false, error: "Carteira admin não configurada." };
  }

  if (!toAddress.startsWith("0x") || toAddress.length !== 42) {
    return { success: false, error: "Endereço de destino inválido." };
  }

  const parsed = Number(amount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { success: false, error: "Valor USDC inválido." };
  }

  try {
    const txHash = await adminWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [toAddress as `0x${string}`, parseUnits(amount, USDC_DECIMALS)],
    });

    return { success: true, txHash };
  } catch (error) {
    console.error("[usdc] transfer failed:", { toAddress, amount, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao transferir USDC.",
    };
  }
}
