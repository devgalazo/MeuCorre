import { addDays, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export type Platform = { id: string; name: string; kind: string; active: boolean; sort: number };
export type DayPlatform = {
  id?: string; platform_id: string; total: number; cash: number; card: number; tips: number; trips: number; hours: number;
};
export type Fueling = { id?: string; amount: number; liters: number | null };
export type Day = {
  id: string; date: string; km: number; maintenance: number; equipment: number; pass: number; food: number; other: number;
  notes: string | null; day_platforms: DayPlatform[]; fuelings: Fueling[];
};
export type Settings = { user_id: string; week_start: number; oil_last_km: number | null; oil_interval_km: number; odometer_km: number | null };
export type MonthlyExpense = { id: string; month: string; category: string; description: string; amount: number };

const n = (v: unknown) => Number(v) || 0;

export const appTotal = (p: DayPlatform) => (n(p.total) > 0 ? n(p.total) : n(p.cash) + n(p.card) + n(p.tips));

export type Totals = {
  dias: number; ganhos: number; combustivel: number; manutencao: number; equipamentos: number; passe: number;
  alimentacao: number; outros: number; despesas: number; lucroOp: number; total: number; sobra: number;
  km: number; horas: number; corridas: number; porHora: number; porKm: number;
  dinheiro: number; cartao: number; gorjeta: number;
  porApp: Record<string, { ganhos: number; horas: number; corridas: number }>;
};

export function sumDays(days: Day[]): Totals {
  const t: Totals = {
    dias: 0, ganhos: 0, combustivel: 0, manutencao: 0, equipamentos: 0, passe: 0, alimentacao: 0, outros: 0,
    despesas: 0, lucroOp: 0, total: 0, sobra: 0, km: 0, horas: 0, corridas: 0, porHora: 0, porKm: 0,
    dinheiro: 0, cartao: 0, gorjeta: 0, porApp: {},
  };
  for (const d of days) {
    t.dias++;
    t.km += n(d.km); t.manutencao += n(d.maintenance); t.equipamentos += n(d.equipment); t.passe += n(d.pass);
    t.alimentacao += n(d.food); t.outros += n(d.other);
    for (const f of d.fuelings) t.combustivel += n(f.amount);
    for (const p of d.day_platforms) {
      const g = appTotal(p);
      t.ganhos += g; t.horas += n(p.hours); t.corridas += n(p.trips);
      t.dinheiro += n(p.cash); t.cartao += n(p.card); t.gorjeta += n(p.tips);
      const a = (t.porApp[p.platform_id] ??= { ganhos: 0, horas: 0, corridas: 0 });
      a.ganhos += g; a.horas += n(p.hours); a.corridas += n(p.trips);
    }
  }
  // Regras combinadas com o usuário
  t.lucroOp = t.ganhos - t.combustivel - t.manutencao;
  t.total = t.lucroOp - t.equipamentos - t.passe;
  t.sobra = t.total - t.alimentacao - t.outros;
  t.despesas = t.combustivel + t.manutencao + t.equipamentos + t.passe + t.alimentacao + t.outros;
  t.porHora = t.horas > 0 ? t.lucroOp / t.horas : 0;
  t.porKm = t.km > 0 ? t.lucroOp / t.km : 0;
  return t;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });

export function fmtHours(h: number) {
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm ? String(mm).padStart(2, "0") : ""}`;
}

/** Aceita "7h30", "7:30", "7,5" ou "7.5" */
export function parseHours(s: string): number {
  const v = s.trim().toLowerCase();
  if (!v) return 0;
  const m = v.match(/^(\d+)\s*[h:]\s*(\d{0,2})\s*(m|min)?$/);
  if (m) {\n    const minutes = m[2] ? Number(m[2]) : 0;\n    if (minutes > 59) return 0;\n    return Number(m[1]) + minutes / 60;\n  }
  return Number(v.replace(",", ".")) || 0;
}
export const parseMoney = (s: string) => Number(String(s).replace(/\./g, (m, i, str) => (str.includes(",") ? "" : m)).replace(",", ".")) || 0;

export const today = () => format(new Date(), "yyyy-MM-dd");
export const fmtDate = (iso: string, f = "EEE, dd/MM") => format(parseISO(iso), f, { locale: ptBR });
export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) => format(parseISO(key + "-01"), "MMMM 'de' yyyy", { locale: ptBR });

export function weekStartOf(iso: string, weekStart: number) {
  const d = parseISO(iso);
  const diff = (d.getDay() - weekStart + 7) % 7;
  return format(addDays(d, -diff), "yyyy-MM-dd");
}
export const firstOfMonth = (key: string) => format(startOfMonth(parseISO(key + "-01")), "yyyy-MM-dd");
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
