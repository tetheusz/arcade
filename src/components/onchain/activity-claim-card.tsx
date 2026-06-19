"use client";

import { useEffect, useState } from "react";

type ClaimStatus = {
  dateKey: string;
  canClaim: boolean;
  snapshot: { merkleRoot: string | null } | null;
  walletAddress: string | null;
};

export function ActivityClaimCard() {
  const [status, setStatus] = useState<ClaimStatus | null>(null);

  useEffect(() => {
    fetch("/api/activity/claim-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
  }, []);

  if (!status) return null;

  return (
    <article className="section-card">
      <p className="eyebrow">On-chain</p>
      <h2>Atividade verificável na Arc</h2>
      {status.snapshot?.merkleRoot ? (
        <div className="wallet-details">
          <p className="muted">Snapshot de {status.dateKey}</p>
          <code className="wallet-address">
            {status.snapshot.merkleRoot.slice(0, 18)}…
          </code>
          {status.canClaim ? (
            <p className="muted">
              Root publicado. Claim via contrato ArcadeActivityRegistry na Arc Testnet
              (em breve na UI — use scripts/onchain hoje).
            </p>
          ) : (
            <p className="muted">Conecte sua carteira para verificar elegibilidade.</p>
          )}
        </div>
      ) : (
        <p className="muted">
          Nenhum snapshot para ontem ainda. Admin pode gerar via{" "}
          <code>npm run snapshot:build</code>.
        </p>
      )}
    </article>
  );
}
