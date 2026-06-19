import { SiteHeader } from "@/components/site-header";

export default function PlayLoading() {
  return (
    <div className="shell">
      <SiteHeader />
      <div className="page-loading" aria-busy="true" aria-label="Carregando desafios">
        <div className="page-loading__hero" />
        <div className="page-loading__card" style={{ minHeight: 280 }} />
        <div className="page-loading__card" style={{ minHeight: 280 }} />
      </div>
    </div>
  );
}
