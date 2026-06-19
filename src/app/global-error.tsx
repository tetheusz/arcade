"use client";

import Link from "next/link";

export default function GlobalErrorPage() {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <main className="narrow stack-md error-view">
            <p className="eyebrow">Erro global</p>
            <h1>O Arcade não conseguiu abrir esta tela.</h1>
            <p className="muted">
              A aplicação encontrou um erro mais sério do que o esperado. Volte
              para a página inicial e tente novamente.
            </p>
            <Link className="button primary" href="/">
              Abrir a home
            </Link>
          </main>
        </div>
      </body>
    </html>
  );
}
