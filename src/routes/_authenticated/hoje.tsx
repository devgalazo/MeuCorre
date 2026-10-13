import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { daysQuery } from "@/lib/data";
import { sumDays, today, brl, fmtHours, num } from "@/lib/calc";
import { PageHeader, Card, Stat } from "@/components/app/bits";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({ meta: [{ title: "Hoje — Corre Moto" }, { name: "description", content: "Resumo do seu dia." }, { property: "og:title", content: "Hoje — Corre Moto" }, { property: "og:description", content: "Resumo do seu dia." }] }),
  component: Hoje,
});

function Hoje() {
  const { data = [], isLoading } = useQuery(daysQuery);
  const t = sumDays(data.filter((d) => d.date === today()));
  return (
    <div>
      <PageHeader subtitle="Hoje" title="Resumo do dia" />
      <div className="space-y-3 px-4">
        <Card><Stat big label="Lucro operacional" value={isLoading ? "..." : brl(t.lucroOp)} tone="accent" /></Card>
        <Card className="grid grid-cols-2 gap-4">
          <Stat label="Ganhos" value={brl(t.ganhos)} />
          <Stat label="Despesas" value={brl(t.despesas)} tone="neg" />
          <Stat label="R$/hora" value={brl(t.porHora)} />
          <Stat label="R$/km" value={brl(t.porKm)} />
          <Stat label="Horas" value={fmtHours(t.horas)} />
          <Stat label="Km" value={num(t.km)} />
        </Card>
      </div>
    </div>
  );
}
