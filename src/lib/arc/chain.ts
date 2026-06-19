import { defineChain } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5042002;

export const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const ERC8183_CONTRACT =
  "0x0747EEf0706327138c69792bF28Cd525089e4583" as const;

export const ARC_EXPLORER = "https://testnet.arcscan.app";
export const ARC_FAUCET = "https://faucet.circle.com";
export const ARC_RPC = "https://rpc.testnet.arc.network";

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_EXPLORER },
  },
});

export function explorerTxUrl(txHash: string) {
  return `${ARC_EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string) {
  return `${ARC_EXPLORER}/address/${address}`;
}
