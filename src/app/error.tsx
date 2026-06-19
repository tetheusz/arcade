"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell">
      <main className="narrow stack-md error-view">
        <p className="eyebrow">Algo saiu do eixo</p>
        <h1>O Arcade encontrou um problema inesperado.</h1>
        <p className="muted">
          A página não conseguiu carregar como deveria. Você pode tentar novamente
          agora ou voltar para a home.
        </p>
        <div className="hero-actions">
          <button type="button" className="button primary" onClick={() => reset()}>
            Tentar de novo
          </button>
          <Link className="button secondary" href="/">
            Voltar para a home
          </Link>
        </div>
      </main>
    </div>
  );
}
