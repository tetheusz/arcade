import { redirect } from "next/navigation";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getAuthProviderConfig } from "@/lib/auth/providers";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getSession();
  const { next, error } = await searchParams;
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
            <p className="eyebrow">Entrar</p>
            <h1>Volte para o loop diário.</h1>
            <p className="muted">
              Entre para registrar streak, resolver os desafios do dia e
              transformar participação em reputação visível.
            </p>
          </div>

          <div className="auth-hero__notes">
            <div className="feature-item">
              <strong>Atividade diária</strong>
              <p>Jogue, pontue e mantenha o histórico vivo.</p>
            </div>
            <div className="feature-item">
              <strong>Ranking público</strong>
              <p>Seu nome aparece conforme a consistência aumenta.</p>
            </div>
            <div className="feature-item">
              <strong>Perfil compartilhável</strong>
              <p>Um ponto público para provar engajamento dentro do Arcade.</p>
            </div>
          </div>
        </section>

        <section className="login-card stack-md">
          <div className="section-heading section-heading--stacked">
            <p className="eyebrow">Entrar</p>
            <h2>Continue de onde parou</h2>
          </div>

          <UserAuthForm
            mode="sign-in"
            redirectTo={nextPath}
            providers={providers}
            oauthError={error === "oauth"}
          />
        </section>
      </main>
    </div>
  );
}
