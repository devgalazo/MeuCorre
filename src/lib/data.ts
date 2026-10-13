import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Day, MonthlyExpense, Platform, Settings } from "./calc";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export const daysQuery = queryOptions({
  queryKey: ["days"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("days")
      .select("*, day_platforms(*), fuelings(*)")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Day[];
  },
});

export const platformsQuery = queryOptions({
  queryKey: ["platforms"],
  queryFn: async () => {
    const { data, error } = await supabase.from("platforms").select("*").order("sort");
    if (error) throw error;
    return (data ?? []) as Platform[];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.from("settings").select("*").eq("user_id", id).maybeSingle();
    if (error) throw error;
    if (data) return data as Settings;
    const { data: created, error: e2 } = await supabase.from("settings").insert({ user_id: id }).select().single();
    if (e2) throw e2;
    return created as Settings;
  },
});

export const monthlyQuery = queryOptions({
  queryKey: ["monthly"],
  queryFn: async () => {
    const { data, error } = await supabase.from("monthly_expenses").select("*").order("created_at");
    if (error) throw error;
    return (data ?? []) as MonthlyExpense[];
  },
});

export type DayInput = Omit<Day, "id"> & { id?: string };

export async function saveDay(input: DayInput) {
  const user_id = await uid();
  const row = {
    user_id, date: input.date, km: input.km, maintenance: input.maintenance, equipment: input.equipment,
    pass: input.pass, food: input.food, other: input.other, notes: input.notes,
  };
  const { data: day, error } = await supabase.from("days").upsert(row, { onConflict: "user_id,date" }).select().single();
  if (error) throw error;
  // Se a data foi alterada na edição, apaga o registro antigo
  if (input.id && input.id !== day.id) await supabase.from("days").delete().eq("id", input.id);
  await supabase.from("day_platforms").delete().eq("day_id", day.id);
  await supabase.from("fuelings").delete().eq("day_id", day.id);
  const dps = input.day_platforms
    .filter((p) => p.total || p.cash || p.card || p.tips || p.trips || p.hours)
    .map(({ id: _i, ...p }) => ({ ...p, user_id, day_id: day.id }));
  if (dps.length) {
    const { error: e } = await supabase.from("day_platforms").insert(dps);
    if (e) throw e;
  }
  const fs = input.fuelings.filter((f) => f.amount > 0).map((f) => ({ amount: f.amount, liters: f.liters, user_id, day_id: day.id }));
  if (fs.length) {
    const { error: e } = await supabase.from("fuelings").insert(fs);
    if (e) throw e;
  }
  return day.id as string;
}

export async function deleteDay(id: string) {
  const { error } = await supabase.from("days").delete().eq("id", id);
  if (error) throw error;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export { uid };
