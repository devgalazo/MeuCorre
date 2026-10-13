import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bike, Gauge, LineChart, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Corre Moto — Controle seus ganhos no Uber Moto e 99 Moto" },
      { name: "description", content: "Lance seu dia em segundos e veja lucro, R$/hora e R$/km automaticamente." },
      { property: "og:title", content: "Corre Moto — Controle seus ganhos" },
      { property: "og:description", content: "Ganhos, gastos e lucro do motoboy por app, dia, semana e mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hoje", replace: true });
    });
  }, [navigate]);

  const items = [
    { icon: Gauge, t: "Lucro por hora e por km" },
    { icon: LineChart, t: "Gráficos por dia, semana e mês" },
    { icon: FileSpreadsheet, t: "Exporta para Excel" },
  ];
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-10">
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bike className="h-8 w-8" />
        </div>
        <h1 className="mt-8 text-4xl font-bold leading-tight">
          Seu corre,<br /><span className="text-primary">na ponta do lápis.</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          Uber Moto, 99 Moto, iFood e outros apps num só lugar. Lance o dia e veja quanto sobrou de verdade.
        </p>
        <ul className="mt-8 space-y-3">
          {items.map(({ icon: I, t }) => (
            <li key={t} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <I className="h-5 w-5 text-primary" /> <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button asChild size="lg" className="mt-10 h-14 rounded-2xl text-base font-bold">
        <Link to="/auth">Entrar ou criar conta</Link>
      </Button>
    </main>
  );
}
