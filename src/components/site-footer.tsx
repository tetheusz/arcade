import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>Arcade</strong>
          <p>
            Hub editorial e de bounties para builders brasileiros no ecossistema Arc
            e Circle.
          </p>
        </div>
        <nav className="site-footer__links" aria-label="Links do rodapé">
          <Link href="/posts">Journal</Link>
          <Link href="/bounties">Bounties</Link>
          <Link href="/jogar">Jogar</Link>
          <Link href="/ranking">Ranking</Link>
          <a href="https://docs.arc.io/" target="_blank" rel="noopener noreferrer">
            Arc Docs
          </a>
          <a
            href="https://developers.circle.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Circle Developers
          </a>
        </nav>
        <p className="site-footer__meta">
          Construído na Arc Testnet · USDC-native · Finalidade determinística
        </p>
      </div>
    </footer>
  );
}
