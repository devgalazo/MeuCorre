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

  // Update/insert desired child rows first. Only remove obsolete rows after all
  // writes succeed, so a failed request cannot erase the previous details.
  const [
    { data: existingPlatforms, error: existingPlatformsError },
    { data: existingFuelings, error: existingFuelingsError },
  ] = await Promise.all([
    supabase.from("day_platforms").select("id").eq("user_id", user_id).eq("day_id", dayId),
    supabase.from("fuelings").select("id").eq("user_id", user_id).eq("day_id", dayId),
  ]);
  if (existingPlatformsError) throw existingPlatformsError;
  if (existingFuelingsError) throw existingFuelingsError;

  const keptPlatformIds = new Set<string>();
  const dps = input.day_platforms.filter((p) => p.total || p.cash || p.card || p.tips || p.trips || p.hours);
  for (const { id, ...platform } of dps) {
    if (id) {
      const { data: updated, error } = await supabase
        .from("day_platforms")
        .update({ ...platform, user_id, day_id: dayId })
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("day_id", dayId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Um dos registros por aplicativo não foi encontrado. Atualize o Histórico e tente novamente.");
      keptPlatformIds.add(updated.id);
    } else {
      const { data: inserted, error } = await supabase
        .from("day_platforms")
        .insert({ ...platform, user_id, day_id: dayId })
        .select("id")
        .single();
      if (error) throw error;
      keptPlatformIds.add(inserted.id);
    }
  }

  const keptFuelingIds = new Set<string>();
  for (const fueling of input.fuelings.filter((f) => f.amount > 0)) {
    const values = { amount: fueling.amount, liters: fueling.liters, user_id, day_id: dayId };
    if (fueling.id) {
      const { data: updated, error } = await supabase
        .from("fuelings")
        .update(values)
        .eq("id", fueling.id)
        .eq("user_id", user_id)
        .eq("day_id", dayId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Um dos abastecimentos não foi encontrado. Atualize o Histórico e tente novamente.");
      keptFuelingIds.add(updated.id);
    } else {
      const { data: inserted, error } = await supabase.from("fuelings").insert(values).select("id").single();
      if (error) throw error;
      keptFuelingIds.add(inserted.id);
    }
  }

  for (const row of existingPlatforms ?? []) {
    if (!keptPlatformIds.has(row.id)) {
      const { error } = await supabase.from("day_platforms").delete().eq("id", row.id).eq("user_id", user_id).eq("day_id", dayId);
      if (error) throw error;
    }
  }
  for (const row of existingFuelings ?? []) {
    if (!keptFuelingIds.has(row.id)) {
      const { error } = await supabase.from("fuelings").delete().eq("id", row.id).eq("user_id", user_id).eq("day_id", dayId);
      if (error) throw error;
    }
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
