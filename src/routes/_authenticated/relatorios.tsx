import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { PageHeader, Card, Stat, Empty } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysQuery, platformsQuery, monthlyQuery } from "@/lib/data";
import { sumDays, brl, fmtDate, monthKey, today } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Corre Moto" }] }),
  component: Relatorios,
});

function Relatorios() {
  const { data: days = [], isLoading } = useQuery(daysQuery);
  const { data: platforms = [] } = useQuery(platformsQuery);
  const { data: expenses = [] } = useQuery(monthlyQuery);
  const [month, setMonth] = useState(today().slice(0, 7));
  const monthDays = useMemo(() => days.filter((d) => monthKey(d.date) === month).slice().sort((a, b) => a.date.localeCompare(b.date)), [days, month]);
  const totals = sumDays(monthDays);
  const fixedExpenses = expenses.filter((e) => e.month.slice(0, 7) === month).reduce((s, e) => s + Number(e.amount || 0), 0);
  const finalBalance = totals.sobra - fixedExpenses;
  const byPlatform = platforms.map((p) => ({
    name: p.name,
    ganhos: monthDays.reduce((s, d) => s + d.day_platforms.filter((dp) => dp.platform_id === p.id).reduce((a, dp) => a + (Number(dp.total) > 0 ? Number(dp.total) : Number(dp.cash || 0) + Number(dp.card || 0) + Number(dp.tips || 0)), 0), 0),
  })).filter((p) => p.ganhos > 0).sort((a, b) => b.ganhos - a.ganhos);
  const daily = monthDays.map((d) => {
    const t = sumDays([d]);
    return { date: fmtDate(d.date, "dd/MM"), faturamento: Number(t.ganhos.toFixed(2)), sobra: Number(t.sobra.toFixed(2)), lucro: Number(t.lucroOp.toFixed(2)) };
  });

  const exportExcel = () => {
    try {
      const dayRows = monthDays.map((d) => {
        const t = sumDays([d]);
        const row: Record<string, string | number> = {
          Data: d.date, KM: d.km, Horas: t.horas, Corridas: t.corridas, Faturamento: t.ganhos,
          Combustível: t.combustivel, Manutenção: t.manutencao, Equipamentos: t.equipamentos,
          Passe: t.passe, Alimentação: t.alimentacao, Outros: t.outros, "Lucro operacional": t.lucroOp,
          "Sobra do dia": t.sobra, Observações: d.notes || "",
        };
        for (const p of platforms) {
          const dp = d.day_platforms.find((x) => x.platform_id === p.id);
          if (dp) row[p.name] = Number(dp.total) > 0 ? dp.total : Number(dp.cash || 0) + Number(dp.card || 0) + Number(dp.tips || 0);
        }
        return row;
      });
      const expenseRows = expenses.filter((e) => e.month.slice(0, 7) === month).map((e) => ({ Mês: e.month.slice(0, 7), Categoria: e.category, Descrição: e.description, Valor: e.amount }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dayRows), "Dias");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(byPlatform), "Por aplicativo");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), "Gastos mensais");
      XLSX.writeFile(workbook, "corre-moto-" + month + ".xlsx");
      toast.success("Planilha exportada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    }
  };

  return <div>
    <PageHeader title="Relatórios" subtitle="Desempenho e médias" right={<Button size="sm" onClick={exportExcel} disabled={isLoading}><Download className="mr-1 h-4 w-4" />Excel</Button>} />
    <div className="space-y-4 px-4 pb-6">
      <Card><label className="block text-xs text-muted-foreground">Mês do relatório<Input className="mt-1 h-11" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label></Card>
      {isLoading ? <Empty>Carregando relatórios…</Empty> : <>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="font-semibold">Resumo de {month}</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Faturamento" value={brl(totals.ganhos)} />
            <Stat label="Lucro operacional" value={brl(totals.lucroOp)} tone="accent" />
            <Stat label="Sobra antes dos fixos" value={brl(totals.sobra)} />
            <Stat label="Gastos mensais fixos" value={brl(fixedExpenses)} tone="neg" />
            <Stat label="Sobra final estimada" value={brl(finalBalance)} tone={finalBalance < 0 ? "neg" : "pos"} />
            <Stat label="R$/hora operacional" value={brl(totals.porHora)} />
            <Stat label="R$/km operacional" value={brl(totals.porKm)} />
            <Stat label="Dias registrados" value={String(totals.dias)} />
          </div>
          <p className="text-xs text-muted-foreground">A sobra final desconta os gastos fixos cadastrados em Ajustes neste mês.</p>
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="font-semibold">Faturamento por aplicativo</h2></div>
          {byPlatform.length === 0 ? <Empty>Sem faturamento lançado neste mês.</Empty> : <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={byPlatform} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={55} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => brl(Number(v))} /><Bar dataKey="ganhos" name="Faturamento" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Evolução diária</h2>
          {daily.length === 0 ? <Empty>Registre os dias para ver a evolução.</Empty> : <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => brl(Number(v))} /><Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="sobra" name="Sobra" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Detalhamento diário</h2>
          {daily.length === 0 ? <Empty>Nenhum dia neste mês.</Empty> : daily.map((d, i) => <div key={monthDays[i].id} className="flex items-center justify-between border-t py-2 text-sm"><span>{d.date}</span><div className="text-right"><strong>{brl(d.faturamento)}</strong><p className="text-xs text-muted-foreground">Sobra {brl(d.sobra)}</p></div></div>)}
        </Card>
      </>}
    </div>
  </div>;
}
