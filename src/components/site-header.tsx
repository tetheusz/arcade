import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SiteHeaderActions } from "@/components/site-header-actions";

function HeaderActionsFallback() {
  return (
    <div className="header-actions header-actions--loading" aria-hidden="true">
      <ThemeToggle />
      <span className="header-skeleton header-skeleton--button" />
      <span className="header-skeleton header-skeleton--button" />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Página inicial do Arcade">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="brand-copy">
          Arcade
          <small>Conteúdo, skill e sinais de engajamento</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Navegação principal">
        <Link href="/">Home</Link>
        <Link href="/jogar">Jogar</Link>
        <Link href="/bounties">Bounties</Link>
        <Link href="/ranking">Ranking</Link>
        <Link href="/perfil">Perfil</Link>
        <Link href="/posts">Posts</Link>
      </nav>

      <Suspense fallback={<HeaderActionsFallback />}>
        <SiteHeaderActions />
      </Suspense>
    </header>
  );
}
