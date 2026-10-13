import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Day, MonthlyExpense, Platform, Settings } from "./calc";

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
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
    const { data: created, error: createError } = await supabase
      .from("settings")
      .insert({ user_id: id })
      .select()
      .single();
    if (createError) throw createError;
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
    user_id,
    date: input.date,
    km: input.km,
    maintenance: input.maintenance,
    equipment: input.equipment,
    pass: input.pass,
    food: input.food,
    other: input.other,
    notes: input.notes,
  };

  // Never let an edit silently overwrite a different day's entry.
  const { data: dateMatch, error: dateError } = await supabase
    .from("days")
    .select("id")
    .eq("user_id", user_id)
    .eq("date", input.date)
    .maybeSingle();
  if (dateError) throw dateError;
  if (dateMatch && dateMatch.id !== input.id) {
    throw new Error("Já existe um lançamento para essa data. Abra esse registro no Histórico para editá-lo.");
  }

  let dayId: string;
  if (input.id) {
    const { data: updated, error } = await supabase
      .from("days")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", user_id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Esse lançamento não foi encontrado. Atualize o Histórico e tente novamente.");
    dayId = updated.id;
  } else {
    const { data: created, error } = await supabase.from("days").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um lançamento para essa data. Abra esse registro no Histórico para editá-lo.");
      }
      throw error;
    }
    dayId = created.id;
  }

  const { error: deletePlatformsError } = await supabase
    .from("day_platforms")
    .delete()
    .eq("user_id", user_id)
    .eq("day_id", dayId);
  if (deletePlatformsError) throw deletePlatformsError;

  const { error: deleteFuelingsError } = await supabase
    .from("fuelings")
    .delete()
    .eq("user_id", user_id)
    .eq("day_id", dayId);
  if (deleteFuelingsError) throw deleteFuelingsError;

  const dps = input.day_platforms
    .filter((p) => p.total || p.cash || p.card || p.tips || p.trips || p.hours)
    .map(({ id: _id, ...p }) => ({ ...p, user_id, day_id: dayId }));
  if (dps.length) {
    const { error } = await supabase.from("day_platforms").insert(dps);
    if (error) throw error;
  }

  const fs = input.fuelings
    .filter((f) => f.amount > 0)
    .map((f) => ({ amount: f.amount, liters: f.liters, user_id, day_id: dayId }));
  if (fs.length) {
    const { error } = await supabase.from("fuelings").insert(fs);
    if (error) throw error;
  }

  return dayId;
}

export async function deleteDay(id: string) {
  const user_id = await uid();
  const { error } = await supabase.from("days").delete().eq("id", id).eq("user_id", user_id);
  if (error) throw error;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export { uid };
