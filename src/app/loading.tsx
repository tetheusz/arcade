import { SiteHeader } from "@/components/site-header";

export default function PageLoading() {
  return (
    <div className="shell">
      <SiteHeader />
      <div className="page-loading" aria-busy="true" aria-label="Carregando">
        <div className="page-loading__hero" />
        <div className="page-loading__row" />
        <div className="page-loading__grid">
          <div className="page-loading__card" />
          <div className="page-loading__card" />
        </div>
      </div>
    </div>
  );
}
