import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Plus, History, BarChart3, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

const tabs = [
  { to: "/hoje", label: "Hoje", icon: Home },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/lancar", label: "Lançar", icon: Plus, main: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
                activeProps={{ className: "text-primary" }}
              >
                {"main" in t ? (
                  <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <t.icon className="h-7 w-7" />
                  </span>
                ) : (
                  <t.icon className="h-5 w-5" />
                )}
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
