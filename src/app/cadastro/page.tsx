import { redirect } from "next/navigation";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getAuthProviderConfig } from "@/lib/auth/providers";

type SignUpPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await getSession();
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/jogar";
  const providers = getAuthProviderConfig();

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="shell">
      <SiteHeader />

      <main className="auth-stage">
        <section className="auth-hero">
          <div className="auth-hero__copy">
            <p className="eyebrow">Criar conta</p>
            <h1>Comece a construir reputação.</h1>
            <p className="muted">
              Crie sua conta para jogar os desafios diários, acumular pontos e
              deixar um rastro público de participação no Arcade.
            </p>
          </div>

          <div className="auth-hero__notes">
            <div className="feature-item">
              <strong>Streak viva</strong>
              <p>Quanto mais dias você volta, mais forte fica o sinal.</p>
            </div>
            <div className="feature-item">
              <strong>Pontuação rastreável</strong>
              <p>Desafios resolvidos viram pontos e reputação.</p>
            </div>
            <div className="feature-item">
              <strong>Camada pública</strong>
              <p>Seu perfil pode virar prova de skill e engajamento.</p>
            </div>
          </div>
        </section>

        <section className="login-card stack-md">
          <div className="section-heading section-heading--stacked">
            <p className="eyebrow">Criar conta</p>
            <h2>Entrar no circuito do Arcade</h2>
          </div>

          <UserAuthForm mode="sign-up" redirectTo={nextPath} providers={providers} />
        </section>
      </main>
    </div>
  );
}
