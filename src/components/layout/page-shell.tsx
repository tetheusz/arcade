import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageShell({ children, className = "shell" }: PageShellProps) {
  return (
    <div className={className}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
