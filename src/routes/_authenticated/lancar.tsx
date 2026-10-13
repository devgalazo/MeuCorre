import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Fuel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Card, NumField } from "@/components/app/bits";
import { daysQuery, platformsQuery, saveDay, useInvalidate } from "@/lib/data";
import { appTotal, parseHours, parseMoney, today, brl, type Day, type DayPlatform, type Fueling } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/lancar")({
  validateSearch: (search: Record<string, unknown>) => ({ id: typeof search.id === "string" ? search.id : undefined, date: typeof search.date === "string" ? search.date : undefined }),
  head: () => ({ meta: [{ title: "Lançar dia — Corre Moto" }] }),
  component: Lancar,
});

const emptyPlatform = (platform_id: string): DayPlatform => ({ platform_id, total: 0, cash: 0, card: 0, tips: 0, trips: 0, hours: 0 });
const money = (v: number) => v ? String(v).replace(".", ",") : "";
const initialDay = (date: string, platformIds: string[]) => ({
  id: undefined as string | undefined, date, km: "", maintenance: "", equipment: "", pass: "", food: "", other: "", notes: "",
  day_platforms: platformIds.map(emptyPlatform), fuelings: [{ amount: "", liters: "" }],
});

function Lancar() {
  const navigate = useNavigate();
  const { data: days = [], isLoading: loadingDays } = useQuery(daysQuery);
  const { data: platforms = [], isLoading: loadingPlatforms } = useQuery(platformsQuery);
  const invalidate = useInvalidate();
  const [form, setForm] = useState(() => initialDay(today(), []));
  const [ready, setReady] = useState(false);
  const [rawHours, setRawHours] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loadingDays || loadingPlatforms || ready) return;
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");
    const requestedDate = params.get("date") || today();
    const found = days.find((d) => d.id === requestedId || d.date === requestedDate);
    const active = platforms.filter((p) => p.active);
    if (found) {
      setForm({
        id: found.id, date: found.date, km: String(found.km || ""), maintenance: String(found.maintenance || ""),
        equipment: String(found.equipment || ""), pass: String(found.pass || ""), food: String(found.food || ""),
        other: String(found.other || ""), notes: found.notes || "",
        day_platforms: platforms.filter((p) => p.active || found.day_platforms.some((x) => x.platform_id === p.id)).map((p) => {
          const existing = found.day_platforms.find((x) => x.platform_id === p.id);
          return existing ? { ...existing } : emptyPlatform(p.id);
        }),
        fuelings: found.fuelings.length ? found.fuelings.map((f) => ({ amount: money(f.amount), liters: f.liters == null ? "" : String(f.liters) })) : [{ amount: "", liters: "" }],
      });
    } else {
      setForm(initialDay(requestedDate, active.map((p) => p.id)));
      setRawHours({});
    }
    setReady(true);
  }, [days, platforms, loadingDays, loadingPlatforms, ready]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const updatePlatform = (id: string, key: keyof DayPlatform, value: string) => setForm((f) => ({
    ...f, day_platforms: f.day_platforms.map((p) => p.platform_id !== id ? p : { ...p, [key]: key === "hours" ? parseHours(value) : key === "trips" ? Number(value) || 0 : parseMoney(value) }),
  }));
  const updateFuel = (index: number, key: "amount" | "liters", value: string) => setForm((f) => ({
    ...f, fuelings: f.fuelings.map((fuel, i) => i !== index ? fuel : { ...fuel, [key]: value }),
  }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.date) throw new Error("Escolha a data do lançamento.");
      const input: Omit<Day, "id"> & { id?: string } = {
        id: form.id, date: form.date, km: parseMoney(form.km), maintenance: parseMoney(form.maintenance),
        equipment: parseMoney(form.equipment), pass: parseMoney(form.pass), food: parseMoney(form.food),
        other: parseMoney(form.other), notes: form.notes.trim() || null,
        day_platforms: form.day_platforms, fuelings: form.fuelings.map((f) => ({
          amount: parseMoney(f.amount), liters: f.liters.trim() ? parseMoney(f.liters) : null,
        })) as Fueling[],
      };
      return saveDay(input);
    },
    onSuccess: async () => {
      await invalidate("days");
      toast.success("Lançamento salvo com sucesso.");
      navigate({ to: "/hoje" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o dia."),
  });

  const totalGanhos = useMemo(() => form.day_platforms.reduce((sum, p) => sum + appTotal(p), 0), [form.day_platforms]);
  const totalFuel = useMemo(() => form.fuelings.reduce((sum, f) => sum + parseMoney(f.amount), 0), [form.fuelings]);
  const activePlatforms = platforms.filter((p) => p.active || form.day_platforms.some((dp) => dp.platform_id === p.id));

  if (loadingDays || loadingPlatforms || !ready) return <div className="p-6 text-sm text-muted-foreground">Carregando seus dados…</div>;

  return (
    <div>
      <PageHeader title={form.id ? "Editar lançamento" : "Lançar dia"} subtitle="Registro diário" />
      <form className="space-y-4 px-4 pb-6" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Card className="space-y-4">
          <h2 className="font-semibold">Dia de trabalho</h2>
          <label className="block text-xs font-medium text-muted-foreground">Data
            <Input className="mt-1 h-12" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
          </label>
          <NumField label="KM total rodado no dia" value={form.km} onChange={(v) => update("km", v)} mode="decimal" />
          <p className="text-xs text-muted-foreground">Inclua todo o deslocamento: ida, volta, espera e corridas.</p>
        </Card>

        <Card className="space-y-4">
          <div><h2 className="font-semibold">Ganhos por aplicativo</h2><p className="text-xs text-muted-foreground">Informe o total ou detalhe dinheiro, cartão e gorjetas.</p></div>
          {activePlatforms.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aplicativo ativo. Ative-os em Ajustes.</p>}
          {activePlatforms.map((platform) => {
            const row = form.day_platforms.find((p) => p.platform_id === platform.id) ?? emptyPlatform(platform.id);
            return <div key={platform.id} className="space-y-3 rounded-xl border p-3">
              <h3 className="font-semibold">{platform.name}</h3>
              <NumField label="Faturamento total (R$)" value={row.total ? money(row.total) : ""} onChange={(v) => updatePlatform(platform.id, "total", v)} prefix="R$" />
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Dinheiro (R$)" value={row.cash ? money(row.cash) : ""} onChange={(v) => updatePlatform(platform.id, "cash", v)} />
                <NumField label="Cartão (R$)" value={row.card ? money(row.card) : ""} onChange={(v) => updatePlatform(platform.id, "card", v)} />
                <NumField label="Gorjetas (R$)" value={row.tips ? money(row.tips) : ""} onChange={(v) => updatePlatform(platform.id, "tips", v)} />
                <NumField label="Nº de corridas/pedidos" value={row.trips ? String(row.trips) : ""} onChange={(v) => updatePlatform(platform.id, "trips", v)} mode="numeric" />
              </div>
              <NumField label="Horas online (ex.: 7h30, 7:30 ou 7,5)" value={rawHours[platform.id] ?? (row.hours ? String(row.hours).replace(".", ",") : "")} onChange={(v) => { setRawHours((h) => ({ ...h, [platform.id]: v })); updatePlatform(platform.id, "hours", v); }} mode="text" />
              <p className="text-right text-sm text-muted-foreground">Total considerado: <strong className="text-foreground">{brl(appTotal(row))}</strong></p>
            </div>;
          })}
          <div className="flex justify-between border-t pt-3 text-sm"><span>Ganhos do dia</span><strong className="text-primary">{brl(totalGanhos)}</strong></div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Abastecimentos</h2><p className="text-xs text-muted-foreground">Adicione cada abastecida feita no dia.</p></div></div>
          {form.fuelings.map((fuel, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <NumField label="Valor (R$)" value={fuel.amount} onChange={(v) => updateFuel(i, "amount", v)} />
            <NumField label="Litros" value={fuel.liters} onChange={(v) => updateFuel(i, "liters", v)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remover abastecimento" onClick={() => setForm((f) => ({ ...f, fuelings: f.fuelings.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <Button type="button" variant="outline" className="w-full" onClick={() => setForm((f) => ({ ...f, fuelings: [...f.fuelings, { amount: "", liters: "" }] }))}><Plus className="mr-2 h-4 w-4" />Adicionar abastecimento</Button>
          <div className="flex justify-between border-t pt-3 text-sm"><span>Total combustível</span><strong>{brl(totalFuel)}</strong></div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Outros gastos do dia</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Manutenção (R$)" value={form.maintenance} onChange={(v) => update("maintenance", v)} />
            <NumField label="Equipamentos (R$)" value={form.equipment} onChange={(v) => update("equipment", v)} />
            <NumField label="Passe (R$)" value={form.pass} onChange={(v) => update("pass", v)} />
            <NumField label="Alimentação (R$)" value={form.food} onChange={(v) => update("food", v)} />
            <NumField label="Outros gastos (R$)" value={form.other} onChange={(v) => update("other", v)} />
          </div>
          <label className="block text-xs font-medium text-muted-foreground">Observações
            <Textarea className="mt-1" rows={3} placeholder="Ex.: chuva, manutenção, turno extra…" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </label>
        </Card>
        <Button className="h-12 w-full rounded-xl text-base font-bold" type="submit" disabled={mutation.isPending}><Save className="mr-2 h-4 w-4" />{mutation.isPending ? "Salvando…" : "Salvar lançamento"}</Button>
      </form>
    </div>
  );
}
