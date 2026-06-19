import { SiteHeader } from "@/components/site-header";

export default function PostsLoading() {
  return (
    <div className="shell shell--journal">
      <SiteHeader />
      <div className="page-loading" aria-busy="true" aria-label="Carregando posts">
        <div className="page-loading__hero" />
        <div className="page-loading__card" />
        <div className="page-loading__card" />
      </div>
    </div>
  );
}
