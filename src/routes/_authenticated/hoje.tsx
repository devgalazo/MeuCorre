import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { daysQuery, settingsQuery } from "@/lib/data";
import { sumDays, today, brl, fmtHours, num } from "@/lib/calc";
import { PageHeader, Card, Stat } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({ meta: [{ title: "Hoje — Corre Moto" }, { name: "description", content: "Resumo do seu dia." }, { property: "og:title", content: "Hoje — Corre Moto" }, { property: "og:description", content: "Resumo do seu dia." }] }),
  component: Hoje,
});

function Hoje() {
  const { data = [], isLoading, isError } = useQuery(daysQuery);
  const { data: settings } = useQuery(settingsQuery);
  const t = sumDays(data.filter((d) => d.date === today()));
  return (
    <div>
      <PageHeader subtitle="Hoje" title="Resumo do dia" />
      <div className="space-y-3 px-4">
        {isError && <Card><p className="text-sm text-destructive">Não foi possível carregar os lançamentos. Verifique sua conexão e tente novamente.</p></Card>}
        {settings?.oil_last_km != null && settings.odometer_km != null && settings.odometer_km >= settings.oil_last_km && (
          <Card className={settings.odometer_km - settings.oil_last_km >= settings.oil_interval_km ? "border-destructive/60" : ""}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Troca de óleo</p>
            <p className={settings.odometer_km - settings.oil_last_km >= settings.oil_interval_km ? "mt-1 font-semibold text-destructive" : "mt-1 font-semibold"}>
              {settings.odometer_km - settings.oil_last_km >= settings.oil_interval_km
                ? "Intervalo atingido — confira a troca de óleo."
                : `Faltam ${(settings.oil_interval_km - (settings.odometer_km - settings.oil_last_km)).toLocaleString("pt-BR")} km para a troca configurada.`}
            </p>
          </Card>
        )}
        <Card><Stat big label="Lucro operacional" value={isLoading || isError ? "..." : brl(t.lucroOp)} tone="accent" /></Card>
        <Card className="grid grid-cols-2 gap-4">
          <Stat label="Ganhos" value={isLoading || isError ? "..." : brl(t.ganhos)} />
          <Stat label="Despesas" value={isLoading || isError ? "..." : brl(t.despesas)} tone="neg" />
          <Stat label="R$/hora bruto" value={isLoading || isError ? "..." : brl(t.brutoPorHora)} />
          <Stat label="R$/hora operacional" value={isLoading || isError ? "..." : brl(t.porHora)} />
          <Stat label="R$/hora líquido" value={isLoading || isError ? "..." : brl(t.liquidoPorHora)} />
          <Stat label="R$/km bruto" value={isLoading || isError ? "..." : brl(t.brutoPorKm)} />
          <Stat label="R$/km operacional" value={isLoading || isError ? "..." : brl(t.porKm)} />
          <Stat label="R$/km líquido" value={isLoading || isError ? "..." : brl(t.liquidoPorKm)} />
          <Stat label="Horas" value={isLoading || isError ? "..." : fmtHours(t.horas)} />
          <Stat label="Km" value={isLoading || isError ? "..." : num(t.km)} />
        </Card>
      </div>
    </div>
  );
}
