"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncSiweWalletProfileAction } from "@/actions/auth";
import { authClient } from "@/lib/auth-client";
import {
  ARC_RPC,
  ARC_TESTNET_CHAIN_ID,
  arcTestnet,
} from "@/lib/arc/chain";
import { createSiweMessage } from "viem/siwe";
import { isAddress } from "viem";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type WalletAuthButtonProps = {
  redirectTo: string;
  enabled: boolean;
};

async function ensureArcChain(provider: EthereumProvider) {
  const chainIdHex = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;

    if (code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: arcTestnet.name,
          nativeCurrency: arcTestnet.nativeCurrency,
          rpcUrls: [ARC_RPC],
          blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
        },
      ],
    });
  }
}

export function WalletAuthButton({ redirectTo, enabled }: WalletAuthButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!enabled) {
    return null;
  }

  function connectWallet() {
    setError(null);

    startTransition(async () => {
      try {
        const provider = window.ethereum;

        if (!provider) {
          setError("Instale MetaMask, Rabby ou outra carteira EVM no navegador.");
          return;
        }

        await ensureArcChain(provider);

        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];

        const walletAddress = accounts[0];

        if (!walletAddress || !isAddress(walletAddress)) {
          setError("Não foi possível obter um endereço válido.");
          return;
        }

        const nonceResult = await authClient.siwe.nonce({
          walletAddress,
          chainId: ARC_TESTNET_CHAIN_ID,
        });

        if (nonceResult.error || !nonceResult.data?.nonce) {
          setError(nonceResult.error?.message ?? "Falha ao gerar nonce.");
          return;
        }

        const domain = window.location.hostname;
        const origin = window.location.origin;

        const message = createSiweMessage({
          domain,
          address: walletAddress as `0x${string}`,
          statement: "Entrar no Arcade com minha carteira.",
          uri: origin,
          version: "1",
          chainId: ARC_TESTNET_CHAIN_ID,
          nonce: nonceResult.data.nonce,
        });

        const signature = (await provider.request({
          method: "personal_sign",
          params: [message, walletAddress],
        })) as string;

        const verifyResult = await authClient.siwe.verify({
          message,
          signature,
          walletAddress,
          chainId: ARC_TESTNET_CHAIN_ID,
        });

        if (verifyResult.error) {
          setError(verifyResult.error.message ?? "Assinatura recusada ou inválida.");
          return;
        }

        await syncSiweWalletProfileAction(walletAddress);

        router.replace(redirectTo);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível conectar a carteira.",
        );
      }
    });
  }

  return (
    <div className="auth-wallet">
      <button
        type="button"
        className="button secondary auth-wallet__button"
        disabled={isPending}
        onClick={connectWallet}
      >
        {isPending ? "Conectando carteira…" : "Entrar com carteira"}
      </button>
      <p className="muted auth-wallet__hint">
        Sign-In with Ethereum na Arc Testnet. Funciona com MetaMask, Rabby e similares.
      </p>
      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}
