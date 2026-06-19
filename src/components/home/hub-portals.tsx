import Link from "next/link";

type HubPortal = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: "journal" | "bounty" | "play";
};

const portals: HubPortal[] = [
  {
    href: "/posts",
    eyebrow: "Journal",
    title: "Contexto em português",
    description: "Traduções oficiais e artigos autorais sobre Arc, Circle e USDC.",
    accent: "journal",
  },
  {
    href: "/bounties",
    eyebrow: "Bounties",
    title: "Entregue e ganhe",
    description: "Missões de protocolos com reputação, escrow ERC-8183 e pagamento em USDC.",
    accent: "bounty",
  },
  {
    href: "/jogar",
    eyebrow: "Arcade",
    title: "Prova diária de skill",
    description: "Puzzle diário, streak e ranking — atividade que vira sinal on-chain.",
    accent: "play",
  },
];

type HubPortalsProps = {
  playHref: string;
};

export function HubPortals({ playHref }: HubPortalsProps) {
  return (
    <section className="hub-portals" aria-labelledby="hub-portals-title">
      <div className="hub-portals__intro">
        <p className="eyebrow">Três trilhas</p>
        <h2 id="hub-portals-title">Escolha por onde entrar no ecossistema.</h2>
      </div>

      <div className="hub-portals__grid">
        {portals.map((portal) => {
          const href = portal.accent === "play" ? playHref : portal.href;

          return (
            <Link
              key={portal.accent}
              href={href}
              className={`hub-portal hub-portal--${portal.accent}`}
            >
              <span className="hub-portal__glow" aria-hidden="true" />
              <span className="hub-portal__eyebrow">{portal.eyebrow}</span>
              <strong className="hub-portal__title">{portal.title}</strong>
              <p className="hub-portal__copy">{portal.description}</p>
              <span className="hub-portal__cta">Entrar →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
