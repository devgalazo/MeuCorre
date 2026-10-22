import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { PageHeader, Card, Stat, Empty } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysQuery, platformsQuery, monthlyQuery, settingsQuery } from "@/lib/data";
import { sumDays, brl, fmtDate, monthKey, today, weekStartOf } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Corre Moto" }] }),
  component: Relatorios,
});

function Relatorios() {
  const { data: days = [], isLoading, isError: daysError } = useQuery(daysQuery);
  const { data: platforms = [], isError: platformsError } = useQuery(platformsQuery);
  const { data: expenses = [], isError: expensesError } = useQuery(monthlyQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [selectedDate, setSelectedDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today());
  const shiftWeek = (offset: number) => {
    const date = new Date(`${weekAnchor}T12:00:00`);
    date.setDate(date.getDate() + offset * 7);
    setWeekAnchor(date.toISOString().slice(0, 10));
  };
  const weekStart = weekStartOf(weekAnchor, settings?.week_start ?? 1);
  const weekEndDate = new Date(weekStart + "T12:00:00");
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);
  const weekLastDate = new Date(weekStart + "T12:00:00");
  weekLastDate.setDate(weekLastDate.getDate() + 6);
  const weekLast = weekLastDate.toISOString().slice(0, 10);
  const monthDays = useMemo(() => (period === "month"
    ? days.filter((d) => monthKey(d.date) === month)
    : period === "week"
      ? days.filter((d) => d.date >= weekStart && d.date < weekEnd)
      : days.filter((d) => d.date === selectedDate)
  ).slice().sort((a, b) => a.date.localeCompare(b.date)), [days, month, period, selectedDate, weekStart, weekEnd]);
  const totals = useMemo(() => sumDays(monthDays), [monthDays]);
  // Não descontar o mês inteiro de despesas fixas em um relatório semanal.
  const fixedExpenses = period === "month"
    ? expenses.filter((e) => e.month.slice(0, 7) === month).reduce((s, e) => s + Number(e.amount || 0), 0)
    : 0;
  const reportTitle = period === "month" ? month : period === "week" ? `Semana de ${fmtDate(weekStart, "dd/MM")} a ${fmtDate(weekLast, "dd/MM")}` : fmtDate(selectedDate, "dd/MM/yyyy");
  const finalBalance = totals.sobra - fixedExpenses;
  const totalExpenses = totals.despesas + fixedExpenses;
  const dailyExpenseItems = monthDays.flatMap((d) => [
    ...d.fuelings.filter((f) => Number(f.amount) > 0).map((f) => ({ date: d.date, category: "Combustível", description: f.liters ? `Abastecimento · ${f.liters} L` : "Abastecimento", amount: Number(f.amount) })),
    ...(Number(d.maintenance) > 0 ? [{ date: d.date, category: "Manutenção", description: "Manutenção", amount: Number(d.maintenance) }] : []),
    ...(Number(d.equipment) > 0 ? [{ date: d.date, category: "Equipamentos", description: "Equipamentos", amount: Number(d.equipment) }] : []),
    ...(Number(d.pass) > 0 ? [{ date: d.date, category: "Passe", description: "Passe", amount: Number(d.pass) }] : []),
    ...(Number(d.food) > 0 ? [{ date: d.date, category: "Alimentação", description: "Alimentação", amount: Number(d.food) }] : []),
    ...(Number(d.other) > 0 ? [{ date: d.date, category: "Outros gastos", description: d.notes?.trim() || "Outros gastos", amount: Number(d.other) }] : []),
  ]);
  const fixedExpenseItems = period === "month"
    ? expenses.filter((e) => e.month.slice(0, 7) === month).map((e) => ({ date: e.month.slice(0, 7) + "-01", category: e.category, description: e.description, amount: Number(e.amount || 0) }))
    : [];
  const expenseItems = [...dailyExpenseItems, ...fixedExpenseItems].sort((a, b) => a.date.localeCompare(b.date));
  const expenseBreakdown = [
    { name: "Combustível", value: totals.combustivel },
    { name: "Manutenção", value: totals.manutencao },
    { name: "Equipamentos", value: totals.equipamentos },
    { name: "Passe", value: totals.passe },
    { name: "Alimentação", value: totals.alimentacao },
    { name: "Outros gastos", value: totals.outros },
    { name: "Gastos fixos", value: fixedExpenses },
  ].filter((item) => item.value > 0);
  const profitExpenseData = [
    ...expenseBreakdown,
    ...(finalBalance > 0 ? [{ name: "Lucro líquido estimado", value: finalBalance }] : []),
  ];
  const pieColors = ["#2563eb", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#64748b", "#db2777", "#16a34a"];
  const byPlatform = useMemo(() => {
    const earningsByPlatform = new Map<string, number>();
    for (const day of monthDays) {
      for (const entry of day.day_platforms) {
        const earnings = Number(entry.total) > 0
          ? Number(entry.total)
          : Number(entry.cash || 0) + Number(entry.card || 0) + Number(entry.tips || 0);
        earningsByPlatform.set(entry.platform_id, (earningsByPlatform.get(entry.platform_id) ?? 0) + earnings);
      }
    }
    return platforms
      .map((platform) => ({ name: platform.name, ganhos: earningsByPlatform.get(platform.id) ?? 0 }))
      .filter((platform) => platform.ganhos > 0)
      .sort((a, b) => b.ganhos - a.ganhos);
  }, [platforms, monthDays]);
  const daily = useMemo(() => monthDays.map((day) => {
    const dayTotals = sumDays([day]);
    return {
      date: fmtDate(day.date, "dd/MM"),
      faturamento: Number(dayTotals.ganhos.toFixed(2)),
      sobra: Number(dayTotals.sobra.toFixed(2)),
      lucro: Number(dayTotals.lucroOp.toFixed(2)),
    };
  }), [monthDays]);

  const exportExcel = async () => {
    try {
      // XLSX pesa bastante; só baixa esse módulo quando o usuário exporta.
      const XLSX = await import("xlsx");
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
      const platformDetailRows = monthDays.flatMap((d) => d.day_platforms.map((dp) => {
        const platform = platforms.find((p) => p.id === dp.platform_id);
        return {
          Data: d.date,
          Aplicativo: platform?.name ?? "Aplicativo removido",
          Faturamento: Number(dp.total) > 0 ? dp.total : Number(dp.cash || 0) + Number(dp.card || 0) + Number(dp.tips || 0),
          Dinheiro: dp.cash,
          Cartão: dp.card,
          Gorjetas: dp.tips,
          Corridas: dp.trips,
          "Horas online": dp.hours,
        };
      }));
      const fuelingRows = monthDays.flatMap((d) => d.fuelings.map((f) => ({
        Data: d.date,
        Valor: f.amount,
        Litros: f.liters ?? "",
        "Preço por litro": f.liters && f.liters > 0 ? Number((f.amount / f.liters).toFixed(3)) : "",
      })));
      const expenseRows = expenseItems.map((e) => ({ Data: e.date, Categoria: e.category, Descrição: e.description, Valor: e.amount }));
      const summaryRows = [
        { Indicador: "Faturamento", Valor: totals.ganhos },
        { Indicador: "Lucro operacional", Valor: totals.lucroOp },
        { Indicador: "Sobra antes dos gastos fixos", Valor: totals.sobra },
        ...(period === "month" ? [{ Indicador: "Gastos fixos do mês", Valor: fixedExpenses }] : []),
        { Indicador: period === "month" ? "Sobra final estimada" : "Sobra da semana", Valor: finalBalance },
        { Indicador: "KM rodados", Valor: totals.km },
        { Indicador: "Horas online", Valor: totals.horas },
        { Indicador: "R$/hora bruto", Valor: totals.brutoPorHora },
        { Indicador: "R$/hora operacional", Valor: totals.porHora },
        { Indicador: "R$/hora líquido", Valor: totals.liquidoPorHora },
        { Indicador: "R$/km bruto", Valor: totals.brutoPorKm },
        { Indicador: "R$/km operacional", Valor: totals.porKm },
        { Indicador: "R$/km líquido", Valor: totals.liquidoPorKm },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumo");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dayRows), "Dias");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(byPlatform), "Resumo por app");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(platformDetailRows), "Detalhe por app");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fuelingRows), "Abastecimentos");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), "Despesas detalhadas");
      XLSX.writeFile(workbook, "corre-moto-" + (period === "month" ? month : period === "week" ? "semana-" + weekStart : "dia-" + selectedDate) + ".xlsx");
      toast.success("Planilha exportada.");
    } catch {
      toast.error("Não foi possível gerar o Excel.");
    }
  };

  return <div>
    <PageHeader title="Relatórios" subtitle="Desempenho e médias" right={<Button size="sm" onClick={exportExcel} disabled={isLoading}><Download className="mr-1 h-4 w-4" />Excel</Button>} />
    <div className="space-y-4 px-4 pb-6">
      <Card className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant={period === "day" ? "default" : "outline"} onClick={() => setPeriod("day")}>Diário</Button>
          <Button type="button" variant={period === "week" ? "default" : "outline"} onClick={() => setPeriod("week")}>Semanal</Button>
          <Button type="button" variant={period === "month" ? "default" : "outline"} onClick={() => setPeriod("month")}>Mensal</Button>
        </div>
        {period === "month"
          ? <label className="block text-xs text-muted-foreground">Mês do relatório<Input className="mt-1 h-11" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          : period === "day"
            ? <label className="block text-xs text-muted-foreground">Dia do relatório<Input className="mt-1 h-11" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></label>
            : <div className="space-y-2"><label className="block text-xs text-muted-foreground">Escolher semana (selecione uma data dentro dela)<Input className="mt-1 h-11" type="date" value={weekAnchor} onChange={(e) => setWeekAnchor(e.target.value)} /></label><div className="flex items-center justify-between gap-2"><Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(-1)} aria-label="Semana anterior"><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><span className="text-center text-sm font-medium"> {fmtDate(weekStart, "dd/MM/yyyy")} a {fmtDate(weekLast, "dd/MM/yyyy")}</span><Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(1)} aria-label="Próxima semana">Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
      </Card>
      {isLoading ? <Empty>Carregando relatórios…</Empty> : daysError || platformsError || expensesError ? <Card><p className="font-semibold text-destructive">Não foi possível carregar os relatórios.</p><p className="mt-1 text-sm text-muted-foreground">Verifique a conexão e tente recarregar a página antes de exportar.</p></Card> : <>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="font-semibold">Resumo · {reportTitle}</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Faturamento" value={brl(totals.ganhos)} />
            <Stat label="Lucro operacional" value={brl(totals.lucroOp)} tone="accent" />
            <Stat label="Sobra antes dos fixos" value={brl(totals.sobra)} />
            {period === "month" && <Stat label="Gastos fixos do mês" value={brl(fixedExpenses)} tone="neg" />}
            <Stat label="Sobra final estimada" value={brl(finalBalance)} tone={finalBalance < 0 ? "neg" : "pos"} />
            <Stat label="R$/hora bruto" value={brl(totals.brutoPorHora)} />
            <Stat label="R$/hora operacional" value={brl(totals.porHora)} />
            <Stat label="R$/hora líquido" value={brl(totals.liquidoPorHora)} />
            <Stat label="R$/km bruto" value={brl(totals.brutoPorKm)} />
            <Stat label="R$/km operacional" value={brl(totals.porKm)} />
            <Stat label="R$/km líquido" value={brl(totals.liquidoPorKm)} />
            <Stat label="Dias registrados" value={String(totals.dias)} />
          </div>
          <p className="text-xs text-muted-foreground">{period === "month" ? "A sobra final desconta os gastos fixos cadastrados em Ajustes neste mês." : "O relatório semanal considera os gastos dos dias selecionados. Gastos fixos mensais não são lançados integralmente em uma única semana."}</p>
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="font-semibold">Faturamento por aplicativo</h2></div>
          {byPlatform.length === 0 ? <Empty>Sem faturamento lançado neste período.</Empty> : <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={byPlatform} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={55} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => brl(Number(v))} /><Bar dataKey="ganhos" name="Faturamento" fill="var(--color-primary)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Evolução diária</h2>
          {daily.length === 0 ? <Empty>Registre os dias para ver a evolução.</Empty> : <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => brl(Number(v))} /><Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--color-primary)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="sobra" name="Sobra" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="font-semibold">Lucro e despesas por categoria</h2></div>
          <p className="text-xs text-muted-foreground">{period === "month" ? "Distribuição do faturamento do mês entre os gastos registrados e o lucro líquido estimado. Os gastos fixos vêm de Ajustes." : period === "week" ? "Distribuição do faturamento da semana entre as despesas registradas nos dias selecionados e a sobra estimada. Gastos fixos mensais não são incluídos no relatório semanal." : "Distribuição do faturamento do dia selecionado entre as despesas registradas e a sobra estimada."}</p>
          {profitExpenseData.length === 0 ? <Empty>Registre faturamentos ou despesas para visualizar a distribuição.</Empty> : <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={profitExpenseData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={58} outerRadius={94} paddingAngle={2}>
                    {profitExpenseData.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => brl(Number(value))} />
                  <Legend verticalAlign="bottom" height={54} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Stat label="Faturamento" value={brl(totals.ganhos)} />
              <Stat label="Despesas totais" value={brl(totalExpenses)} tone="neg" />
              <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                <Stat label={finalBalance < 0 ? "Déficit estimado" : "Lucro líquido estimado"} value={brl(finalBalance)} tone={finalBalance < 0 ? "neg" : "pos"} />
              </div>
            </div>
            {finalBalance < 0 && <p className="text-xs text-muted-foreground">{period === "month" ? "As despesas superaram o faturamento neste mês; por isso o déficit aparece no resumo, e o gráfico detalha a composição dos gastos." : period === "week" ? "As despesas dos dias selecionados superaram o faturamento da semana; o gráfico detalha a composição dos gastos." : "As despesas superaram o faturamento do dia selecionado; o gráfico detalha a composição dos gastos."}</p>}
          </>}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Detalhamento diário</h2>
          {daily.length === 0 ? <Empty>Nenhum dia neste período.</Empty> : daily.map((d, i) => <div key={monthDays[i].id} className="flex items-center justify-between border-t py-2 text-sm"><span>{d.date}</span><div className="text-right"><strong>{brl(d.faturamento)}</strong><p className="text-xs text-muted-foreground">Sobra {brl(d.sobra)}</p></div></div>)}
        </Card>
        <Card className="space-y-3">
          <div><h2 className="font-semibold">Lista de despesas</h2><p className="text-xs text-muted-foreground">Cada gasto aparece separado por data, categoria, descrição e valor.</p></div>
          {expenseItems.length === 0 ? <Empty>Nenhuma despesa registrada neste período.</Empty> : <>
            <div className="flex items-center justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">{expenseItems.length} itens</span><strong>{brl(expenseItems.reduce((sum, item) => sum + item.amount, 0))}</strong></div>
            {expenseItems.map((item, index) => <div key={`${item.date}-${item.category}-${item.description}-${index}`} className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
              <div className="min-w-0"><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{fmtDate(item.date, "dd/MM/yyyy")} · {item.category}</p></div>
              <strong className="num shrink-0">{brl(item.amount)}</strong>
            </div>)}
          </>}
        </Card>
      </>}
    </div>
  </div>;
}
