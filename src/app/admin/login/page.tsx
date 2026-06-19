import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { SiteHeader } from "@/components/site-header";
import { isAdminAuthenticated } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <div className="shell">
      <SiteHeader />
      <main className="centered-shell">
        <section className="login-card stack-md">
          <div className="section-heading">
            <p className="eyebrow">Área segura</p>
            <h1>Entrar no admin</h1>
          </div>

          <p className="muted">
            Entre com o usuário admin criado no banco para criar e editar posts.
          </p>

          {error ? <p className="error-banner">{error}</p> : null}

          <LoginForm />

          <Link className="text-link" href="/">
            Voltar para o blog
          </Link>
        </section>
      </main>
    </div>
  );
}
