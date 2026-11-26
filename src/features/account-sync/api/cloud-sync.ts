import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { loadProfiles, writeProfiles, type BusinessProfile } from "@/features/local-seo/api/business-profile";
import { loadRecipes, writeRecipes } from "@/features/recipes/api/recipe-storage";
import { recipeSchema, type Recipe } from "@/features/recipes/api/recipe";
import { emitSynced, type LocalChange } from "./local-change";

const PREF = "squished:account-sync";
const TABLE = { recipes: "saved_recipes", businesses: "business_profiles" } as const;

export type SyncPref = "on" | "off" | null;
export function getSyncPref(userId: string): SyncPref {
  try { const v = localStorage.getItem(`${PREF}:${userId}`); return v === "on" || v === "off" ? v : null; } catch { return null; }
}
export function setSyncPref(userId: string, v: "on" | "off") {
  try { localStorage.setItem(`${PREF}:${userId}`, v); } catch { /* ignore */ }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const toProfile = (id: string, d: Record<string, unknown>): BusinessProfile => ({
  id, name: str(d.name), city: str(d.city), address: str(d.address), latitude: str(d.latitude),
  longitude: str(d.longitude), services: str(d.services),
  ...(d.author ? { author: str(d.author) } : {}), ...(d.copyright ? { copyright: str(d.copyright) } : {}),
});

/** Mirror one local save/delete to the account. */
export async function pushChange(userId: string, c: LocalChange) {
  const table = TABLE[c.collection];
  const { error } = c.op === "delete"
    ? await supabase.from(table).delete().eq("id", c.id).eq("user_id", userId)
    : await supabase.from(table).upsert({ id: c.id, user_id: userId, name: c.name || "Untitled", data: c.data as Json });
  if (error) throw new Error("Couldn't sync to your account.");
}

/** Two-way merge: account rows win by id, device-only rows are uploaded. Returns counts. */
export async function syncAll(userId: string): Promise<{ recipes: number; businesses: number }> {
  const [rec, biz] = await Promise.all([
    supabase.from("saved_recipes").select("id,name,data,updated_at").order("updated_at", { ascending: false }).limit(50),
    supabase.from("business_profiles").select("id,name,data,updated_at").order("updated_at", { ascending: false }).limit(50),
  ]);
  if (rec.error || biz.error) throw new Error("Couldn't load your synced recipes.");

  const cloudRecipes: Recipe[] = rec.data.flatMap((r) => {
    const p = recipeSchema.safeParse(r.data);
    return p.success ? [{ ...p.data, id: r.id }] : [];
  });
  const cloudProfiles = biz.data.map((r) => toProfile(r.id, (r.data ?? {}) as Record<string, unknown>));

  const localRecipes = loadRecipes().filter((r) => !cloudRecipes.some((c) => c.id === r.id));
  const localProfiles = loadProfiles().filter((p) => !cloudProfiles.some((c) => c.id === p.id));
  for (const r of localRecipes) {
    const { id, ...data } = r;
    await pushChange(userId, { collection: "recipes", op: "save", id, name: r.name, data: recipeSchema.parse(data) });
  }
  for (const p of localProfiles) {
    const { id, ...data } = p;
    await pushChange(userId, { collection: "businesses", op: "save", id, name: p.name.slice(0, 120), data });
  }
  writeRecipes([...cloudRecipes, ...localRecipes]);
  writeProfiles([...cloudProfiles, ...localProfiles]);
  emitSynced();
  return { recipes: cloudRecipes.length + localRecipes.length, businesses: cloudProfiles.length + localProfiles.length };
}
