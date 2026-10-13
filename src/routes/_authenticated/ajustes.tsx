import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Save, Droplet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, NumField, Empty } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { settingsQuery, platformsQuery, monthlyQuery, uid, useInvalidate } from "@/lib/data";
import { brl, today, WEEKDAYS, parseMoney } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Corre Moto" }] }),
  component: Ajustes,
});

function Ajustes() {
  const { data: settings, isLoading: loadingSettings, isError: settingsError } = useQuery(settingsQuery);
  const { data: platforms = [], isLoading: loadingPlatforms, isError: platformsError } = useQuery(platformsQuery);
  const { data: expenses = [], isLoading: loadingExpenses, isError: expensesError } = useQuery(monthlyQuery);
  const invalidate = useInvalidate();
  const [weekStart, setWeekStart] = useState<number | null>(null);
  const [lastKm, setLastKm] = useState<string | null>(null);
  const [intervalKm, setIntervalKm] = useState<string | null>(null);
  const [odometer, setOdometer] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Assinatura");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseMonth, setExpenseMonth] = useState(today().slice(0, 7));

  const saveSettings = useMutation({
    mutationFn: async () => {
      const user_id = await uid();
      const row = {
        user_id,
        week_start: weekStart ?? settings?.week_start ?? 1,
        oil_last_km: (lastKm ?? String(settings?.oil_last_km ?? "")).trim() ? Number(lastKm ?? settings?.oil_last_km) : null,
        oil_interval_km: Number(intervalKm ?? settings?.oil_interval_km ?? 1000) || 1000,
        odometer_km: (odometer ?? String(settings?.odometer_km ?? "")).trim() ? Number(odometer ?? settings?.odometer_km) : null,
      };
      const { error } = await supabase.from("settings").upsert(row, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: async () => { await invalidate("settings"); toast.success("Ajustes salvos."); },
    onError: () => toast.error("Não foi possível salvar os ajustes."),
  });
  const togglePlatform = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("platforms").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => { await invalidate("platforms"); },
    onError: () => toast.error("Não foi possível atualizar o aplicativo."),
  });
  const addPlatform = useMutation({
    mutationFn: async () => {
      const name = newPlatform.trim();
      if (!name) throw new Error("Digite o nome do aplicativo.");
      if (platforms.some((p) => p.name.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
        throw new Error("Esse aplicativo já está cadastrado.");
      }
      const user_id = await uid();
      const { error } = await supabase.from("platforms").insert({ user_id, name, kind: "delivery", active: true, sort: platforms.length + 1 });
      if (error) throw error;
    },
    onSuccess: async () => { setNewPlatform(""); await invalidate("platforms"); toast.success("Aplicativo adicionado."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível adicionar."),
  });
  const addExpense = useMutation({
    mutationFn: async () => {
      if (!expenseDescription.trim()) throw new Error("Informe a descrição do gasto.");
      const amount = parseMoney(expenseAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor válido.");
      const user_id = await uid();
      const { error } = await supabase.from("monthly_expenses").insert({
        user_id, month: expenseMonth + "-01", category: expenseCategory, description: expenseDescription.trim(), amount,
      });
      if (error) throw error;
    },
    onSuccess: async () => { setExpenseDescription(""); setExpenseAmount(""); await invalidate("monthly"); toast.success("Gasto mensal adicionado."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar o gasto."),
  });
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => { await invalidate("monthly"); toast.success("Gasto removido."); },
    onError: () => toast.error("Não foi possível remover o gasto."),
  });

  if (loadingSettings || loadingPlatforms || loadingExpenses) return <div className="p-6 text-sm text-muted-foreground">Carregando ajustes…</div>;
  if (settingsError || platformsError || expensesError || !settings) return <div className="space-y-2 p-6 text-sm"><p className="font-semibold text-destructive">Não foi possível carregar os ajustes.</p><p className="text-muted-foreground">Verifique sua conexão e tente recarregar a página. Nenhuma alteração foi salva.</p></div>;
  const week = weekStart ?? settings.week_start;
  const last = lastKm ?? (settings.oil_last_km == null ? "" : String(settings.oil_last_km));
  const interval = intervalKm ?? String(settings.oil_interval_km);
  const odo = odometer ?? (settings.odometer_km == null ? "" : String(settings.odometer_km));
  const currentMonthExpenses = expenses.filter((e) => e.month.slice(0, 7) === expenseMonth);

  return <div>
    <PageHeader title="Ajustes" subtitle="Personalize seu controle" />
    <div className="space-y-4 px-4 pb-6">
      <Card className="space-y-4">
        <h2 className="font-semibold">Preferências</h2>
        <label className="block text-xs text-muted-foreground">Início da semana
          <Select value={String(week)} onValueChange={(v) => setWeekStart(Number(v))}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select>
        </label>
      </Card>
      <Card className="space-y-4">
        <div className="flex items-center gap-2"><Droplet className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Troca de óleo</h2><p className="text-xs text-muted-foreground">Controle pelo hodômetro da moto.</p></div></div>
        <NumField label="KM atual da moto" value={odo} onChange={setOdometer} mode="numeric" />
        <div className="grid grid-cols-2 gap-3">
          <NumField label="KM da última troca" value={last} onChange={setLastKm} mode="numeric" />
          <NumField label="Intervalo (km)" value={interval} onChange={setIntervalKm} mode="numeric" />
        </div>
        {last !== "" && odo !== "" && Number(odo) >= Number(last) && <div className="rounded-xl bg-muted/40 p-3 text-sm"><p>Rodados desde a troca: <strong>{(Number(odo) - Number(last)).toLocaleString("pt-BR")} km</strong></p><p className={Number(odo) - Number(last) >= Number(interval) ? "mt-1 font-semibold text-destructive" : "mt-1 text-muted-foreground"}>{Number(odo) - Number(last) >= Number(interval) ? "Atenção: intervalo atingido. Verifique a troca de óleo." : "Faltam " + (Number(interval) - (Number(odo) - Number(last))).toLocaleString("pt-BR") + " km para o intervalo configurado."}</p></div>}
        <Button className="w-full" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}><Save className="mr-2 h-4 w-4" />Salvar preferências</Button>
      </Card>
      <Card className="space-y-4">
        <div><h2 className="font-semibold">Aplicativos</h2><p className="text-xs text-muted-foreground">Escolha quais aparecem no lançamento diário.</p></div>
        {platforms.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"><span className="text-sm">{p.name}</span><Switch checked={p.active} onCheckedChange={(active) => togglePlatform.mutate({ id: p.id, active })} aria-label={"Ativar " + p.name} /></div>)}
        <div className="flex gap-2"><Input value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder="Nome de outro aplicativo" className="h-11" /><Button aria-label="Adicionar aplicativo" onClick={() => addPlatform.mutate()} disabled={addPlatform.isPending}><Plus className="h-4 w-4" /></Button></div>
      </Card>
      <Card className="space-y-4">
        <div><h2 className="font-semibold">Gastos mensais</h2><p className="text-xs text-muted-foreground">Assinaturas e custos fixos abatidos da sobra do mês.</p></div>
        <label className="block text-xs text-muted-foreground">Mês
          <Input className="mt-1 h-11" type="month" value={expenseMonth} onChange={(e) => setExpenseMonth(e.target.value)} />
        </label>
        <label className="block text-xs text-muted-foreground">Categoria
          <Select value={expenseCategory} onValueChange={setExpenseCategory}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{["Assinatura", "Celular", "Academia", "Seguro", "Aluguel", "Outro"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        </label>
        <Input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="Ex.: plano de celular" className="h-11" />
        <NumField label="Valor mensal (R$)" value={expenseAmount} onChange={setExpenseAmount} />
        <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending}><Plus className="mr-2 h-4 w-4" />Adicionar gasto fixo</Button>
        <div className="border-t pt-3"><div className="mb-2 flex justify-between text-sm"><span>Total de {expenseMonth}</span><strong>{brl(currentMonthExpenses.reduce((s, e) => s + e.amount, 0))}</strong></div>
          {currentMonthExpenses.length === 0 && <Empty>Nenhum gasto cadastrado neste mês.</Empty>}
          {currentMonthExpenses.map((e) => <div key={e.id} className="flex items-center justify-between gap-3 border-t py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{e.category}</p></div><div className="flex items-center gap-2"><strong className="num text-sm">{brl(e.amount)}</strong><Button variant="ghost" size="icon" aria-label="Remover gasto" onClick={() => deleteExpense.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>)}
        </div>
      </Card>
    </div>
  </div>;
}
