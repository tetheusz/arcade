import { createWalletClient, http, publicActions, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import {
  arcTestnet,
  ERC8183_CONTRACT,
  USDC_ADDRESS,
  explorerTxUrl,
} from "@/lib/arc/chain";

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}` | undefined;
const SBT_CONTRACT_ADDRESS = process.env.SBT_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const adminWalletClient = ADMIN_KEY
  ? createWalletClient({
      account: privateKeyToAccount(ADMIN_KEY),
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions)
  : null;

const SBT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "badgeName", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

const ERC8183_ABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverableHash", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "complete",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "reason", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "client", type: "address" },
          { name: "provider", type: "address" },
          { name: "evaluator", type: "address" },
          { name: "budget", type: "uint256" },
          { name: "state", type: "uint8" },
        ],
      },
    ],
  },
] as const;

const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function hashDeliverable(content: string) {
  return keccak256(toHex(content));
}

export async function mintSoulboundBadge(
  userBadgeId: string,
  contributorAddress: string,
  badgeName: string,
) {
  if (!adminWalletClient) {
    console.warn("[onchain] ADMIN_PRIVATE_KEY não configurada.");
    return null;
  }

  try {
    let txHash: string;

    if (SBT_CONTRACT_ADDRESS) {
      txHash = await adminWalletClient.writeContract({
        address: SBT_CONTRACT_ADDRESS,
        abi: SBT_ABI,
        functionName: "mint",
        args: [contributorAddress as `0x${string}`, badgeName],
      });
    } else {
      txHash = `0x${"0".repeat(64)}`;
    }

    await prisma.onChainProof.create({
      data: {
        entityType: "BADGE",
        entityId: userBadgeId,
        proofType: "SBT",
        transactionHash: txHash,
        chainId: arcTestnet.id,
      },
    });

    return { txHash, explorerUrl: explorerTxUrl(txHash) };
  } catch (error) {
    console.error("[onchain] SBT mint failed:", error);
    return null;
  }
}

export async function createEscrowJob(params: {
  missionId: string;
  providerAddress: string;
  evaluatorAddress: string;
  description: string;
  expiredAt: number;
  budgetWei: bigint;
}) {
  if (!adminWalletClient) {
    return { success: false as const, error: "Admin wallet não configurada." };
  }

  try {
    const { request, result } = await adminWalletClient.simulateContract({
      address: ERC8183_CONTRACT,
      abi: ERC8183_ABI,
      functionName: "createJob",
      args: [
        params.providerAddress as `0x${string}`,
        params.evaluatorAddress as `0x${string}`,
        BigInt(params.expiredAt),
        params.description,
        "0x0000000000000000000000000000000000000000",
      ],
    });

    const createHash = await adminWalletClient.writeContract(request);
    const jobId = result.toString();

    await prisma.mission.update({
      where: { id: params.missionId },
      data: { escrowStatus: "OPEN" },
    });

    return { success: true as const, txHash: createHash, jobId };
  } catch (error) {
    console.error("[erc8183] createJob failed:", error);
    return { success: false as const, error: String(error) };
  }
}

export async function fundEscrowJob(jobId: string, budgetWei: bigint) {
  if (!adminWalletClient) {
    return { success: false as const, error: "Admin wallet não configurada." };
  }

  try {
    await adminWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "approve",
      args: [ERC8183_CONTRACT, budgetWei],
    });

    const fundHash = await adminWalletClient.writeContract({
      address: ERC8183_CONTRACT,
      abi: ERC8183_ABI,
      functionName: "fund",
      args: [BigInt(jobId), "0x"],
    });

    return { success: true as const, txHash: fundHash };
  } catch (error) {
    console.error("[erc8183] fund failed:", error);
    return { success: false as const, error: String(error) };
  }
}

export async function submitEscrowDeliverable(jobId: string, deliverableContent: string) {
  if (!adminWalletClient) {
    return { success: false as const, error: "Admin wallet não configurada." };
  }

  const deliverableHash = hashDeliverable(deliverableContent);

  try {
    const txHash = await adminWalletClient.writeContract({
      address: ERC8183_CONTRACT,
      abi: ERC8183_ABI,
      functionName: "submit",
      args: [BigInt(jobId), deliverableHash, "0x"],
    });

    return { success: true as const, txHash, deliverableHash };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function completeEscrowJob(jobId: string, reason = "deliverable-approved") {
  if (!adminWalletClient) {
    return { success: false as const, error: "Admin wallet não configurada." };
  }

  const reasonHash = keccak256(toHex(reason));

  try {
    const txHash = await adminWalletClient.writeContract({
      address: ERC8183_CONTRACT,
      abi: ERC8183_ABI,
      functionName: "complete",
      args: [BigInt(jobId), reasonHash, "0x"],
    });

    return { success: true as const, txHash };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export { ERC8183_ABI, SBT_ABI };
