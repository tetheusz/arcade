import { SiteHeader } from "@/components/site-header";

export default function RankingLoading() {
  return (
    <div className="shell">
      <SiteHeader />
      <div className="page-loading" aria-busy="true" aria-label="Carregando ranking">
        <div className="page-loading__hero" />
        <div className="page-loading__grid">
          <div className="page-loading__card" />
          <div className="page-loading__card" />
          <div className="page-loading__card" />
        </div>
      </div>
    </div>
  );
}
