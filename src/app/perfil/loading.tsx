import { SiteHeader } from "@/components/site-header";

export default function ProfileLoading() {
  return (
    <div className="shell">
      <SiteHeader />
      <div className="page-loading" aria-busy="true" aria-label="Carregando perfil">
        <div className="page-loading__hero" />
        <div className="page-loading__card" style={{ minHeight: 220 }} />
        <div className="page-loading__grid">
          <div className="page-loading__card" />
          <div className="page-loading__card" />
        </div>
      </div>
    </div>
  );
}
