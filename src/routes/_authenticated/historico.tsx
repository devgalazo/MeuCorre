import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Card, Empty } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { daysQuery, deleteDay, useInvalidate } from "@/lib/data";
import { sumDays, brl, fmtDate, fmtHours, today, weekStartOf, monthKey, type Day } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — Corre Moto" }] }),
  component: Historico,
});

function Historico() {
  const { data = [], isLoading, isError } = useQuery(daysQuery);
  const invalidate = useInvalidate();
  const [period, setPeriod] = useState("month");
  const [anchor, setAnchor] = useState(today());
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: deleteDay,
    onSuccess: async () => { await invalidate("days"); toast.success("Dia excluído."); setDeleting(null); },
    onError: () => toast.error("Não foi possível excluir o registro."),
  });
  const filtered = useMemo(() => {
    let rows = data;
    if (period === "day") rows = rows.filter((d) => d.date === anchor);
    if (period === "week") {
      const start = weekStartOf(anchor, 1);
      const end = new Date(start + "T12:00:00");
      end.setDate(end.getDate() + 7);
      const endKey = end.toISOString().slice(0, 10);
      rows = rows.filter((d) => d.date >= start && d.date < endKey);
    }
    if (period === "month") rows = rows.filter((d) => monthKey(d.date) === monthKey(anchor));
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (q) rows = rows.filter((d) => d.date.includes(q) || (d.notes || "").toLocaleLowerCase("pt-BR").includes(q));
    return rows;
  }, [data, period, anchor, search]);
  const totals = sumDays(filtered);

  return <div>
    <PageHeader title="Histórico" subtitle="Seus lançamentos" right={<Button asChild size="sm"><Link to="/lancar"><Plus className="mr-1 h-4 w-4" />Novo</Link></Button>} />
    <div className="space-y-4 px-4 pb-6">
      <Card className="space-y-3">
        <label className="block text-xs text-muted-foreground">Período
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="day">Dia</SelectItem><SelectItem value="week">Semana</SelectItem><SelectItem value="month">Mês</SelectItem><SelectItem value="all">Todo o histórico</SelectItem>
          </SelectContent></Select>
        </label>
        {period !== "all" && <label className="block text-xs text-muted-foreground">Data de referência
          <Input className="mt-1 h-11" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
        </label>}
        <label className="block text-xs text-muted-foreground"><Search className="mr-1 inline h-3 w-3" />Buscar por data ou observação
          <Input className="mt-1 h-11" placeholder="Ex.: chuva, 2026-10-12" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div><p className="text-xs text-muted-foreground">Faturamento</p><p className="num font-semibold">{brl(totals.ganhos)}</p></div>
          <div><p className="text-xs text-muted-foreground">Sobra estimada</p><p className="num font-semibold text-primary">{brl(totals.sobra)}</p></div>
        </div>
      </Card>
      {isLoading && <Empty>Carregando histórico…</Empty>}
      {isError && <Card><p className="text-sm text-destructive">Erro ao carregar. Verifique sua conexão e tente novamente.</p></Card>}
      {!isLoading && filtered.length === 0 && <Card><Empty><CalendarDays className="mx-auto mb-2 h-6 w-6" />Nenhum lançamento nesse período.</Empty></Card>}
      {filtered.map((d: Day) => {
        const t = sumDays([d]);
        return <Card key={d.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold capitalize">{fmtDate(d.date, "EEEE, dd 'de' MMMM")}</h2><p className="text-xs text-muted-foreground">{d.km || 0} km · {fmtHours(t.horas)} online · {t.corridas} corridas/pedidos</p></div>
            <p className="num text-right font-bold text-primary">{brl(t.sobra)}<span className="block text-[10px] font-normal text-muted-foreground">sobra estimada</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-xs text-muted-foreground">Faturamento</p><strong>{brl(t.ganhos)}</strong></div>
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-xs text-muted-foreground">Despesas</p><strong>{brl(t.despesas)}</strong></div>
          </div>
          {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
          <div className="flex gap-2 border-t pt-3">
            <Button asChild variant="outline" className="flex-1"><Link to="/lancar" search={{ id: d.id }}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
            <AlertDialog open={deleting === d.id} onOpenChange={(open) => setDeleting(open ? d.id : null)}>
              <AlertDialogTrigger asChild><Button variant="outline" size="icon" aria-label="Excluir dia"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este dia?</AlertDialogTitle><AlertDialogDescription>O lançamento de {fmtDate(d.date, "dd/MM/yyyy")}, incluindo abastecimentos e ganhos por app, será removido permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => mutation.mutate(d.id)} disabled={mutation.isPending}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>;
      })}
    </div>
  </div>;
}
