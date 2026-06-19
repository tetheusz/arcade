import Link from "next/link";
import { LogoutButton } from "@/components/admin/logout-button";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getHeaderProfileLabel } from "@/lib/session-profile";

export async function SiteHeaderActions() {
  const session = await getSession();
  const admin = Boolean(session && session.user.email === process.env.ADMIN_EMAIL);
  const playHref = session ? "/jogar" : "/entrar?next=%2Fjogar";

  const profileLabel = session
    ? await getHeaderProfileLabel(session.user.id, session.user.name)
    : "Perfil";

  return (
    <div className="header-actions">
      <ThemeToggle />
      {session ? (
        <>
          <Link className="button primary" href={playHref}>
            Jogar
          </Link>
          <Link className="button secondary" href="/perfil">
            {profileLabel}
          </Link>
          {admin ? (
            <Link className="button secondary" href="/admin">
              Admin
            </Link>
          ) : null}
          <LogoutButton redirectTo="/" label="Sair" />
        </>
      ) : (
        <>
          <Link className="button secondary" href={playHref}>
            Jogar
          </Link>
          <Link className="button primary" href="/cadastro">
            Criar conta
          </Link>
        </>
      )}
    </div>
  );
}
