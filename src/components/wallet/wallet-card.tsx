"use client";

import { useEffect, useState, useTransition } from "react";
import { provisionWalletAction } from "@/actions/bounties";
import { ARC_FAUCET, explorerAddressUrl } from "@/lib/arc/chain";

type WalletCardProps = {
  walletAddress: string | null;
  walletState: string;
  usdcEarned: string;
  isMock?: boolean;
};

export function WalletCard({
  walletAddress,
  walletState,
  usdcEarned,
  isMock = false,
}: WalletCardProps) {
  const [pending, startTransition] = useTransition();
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  useEffect(() => {
    if (walletState !== "ACTIVE" || !walletAddress) {
      setUsdcBalance(null);
      return;
    }

    let cancelled = false;

    fetch("/api/wallet/usdc-balance")
      .then((response) => (response.ok ? response.json() : { balance: "0" }))
      .then((data: { balance?: string }) => {
        if (!cancelled) {
          setUsdcBalance(data.balance ?? "0");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsdcBalance("0");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, walletState]);

  function handleProvision() {
    startTransition(async () => {
      await provisionWalletAction();
      window.location.reload();
    });
  }

  const balanceLabel =
    usdcBalance === null ? "…" : `${parseFloat(usdcBalance).toFixed(4)} USDC`;

  return (
    <article className="section-card wallet-card">
      <div className="section-heading section-heading--stacked">
        <p className="eyebrow">Carteira Arc</p>
        <h2>{isMock ? "Carteira dev (mock)" : "Circle Wallet"}</h2>
      </div>

      {walletState === "ACTIVE" && walletAddress ? (
        <div className="wallet-details">
          {isMock ? (
            <p className="muted">
              Modo desenvolvimento — Circle indisponível ou não configurado. A carteira
              real será provisionada quando a API responder.
            </p>
          ) : null}
          <div className="wallet-row">
            <span className="muted">Endereço</span>
            <code className="wallet-address">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </code>
          </div>
          <div className="wallet-row">
            <span className="muted">Saldo USDC</span>
            <strong>{balanceLabel}</strong>
          </div>
          <div className="wallet-row">
            <span className="muted">USDC ganho (bounties)</span>
            <strong>{parseFloat(usdcEarned).toFixed(4)} USDC</strong>
          </div>
          <div className="wallet-actions">
            {!isMock ? (
              <a
                className="button secondary"
                href={ARC_FAUCET}
                target="_blank"
                rel="noopener noreferrer"
              >
                Obter USDC testnet
              </a>
            ) : null}
            <a
              className="button secondary"
              href={explorerAddressUrl(walletAddress)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver no explorer
            </a>
          </div>
        </div>
      ) : (
        <div className="wallet-details">
          {walletState === "FAILED" ? (
            <p className="muted">
              Falha ao provisionar carteira Circle. Tente novamente ou verifique{" "}
              <code>CIRCLE_API_KEY</code> e <code>CIRCLE_ENTITY_SECRET</code> no .env.
            </p>
          ) : (
            <p className="muted">
              Sua carteira Circle na Arc Testnet será criada automaticamente. USDC é
              o token de gas na Arc.
            </p>
          )}
          <button
            className="button primary"
            type="button"
            disabled={pending}
            onClick={handleProvision}
          >
            {pending ? "Provisionando…" : "Ativar carteira Arc"}
          </button>
        </div>
      )}
    </article>
  );
}
