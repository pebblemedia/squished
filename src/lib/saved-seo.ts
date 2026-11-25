import { supabase } from "@/integrations/supabase/client";
import { imageMetaSchema, photoSeoColumns } from "./seo-fields";
import type { QueueItem } from "./files";

export async function listSavedSeo() {
  const { data, error } = await supabase.from("photo_seo").select(photoSeoColumns).order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error("Couldn't load saved SEO details. Please try again.");
  return data ?? [];
}

export async function getSavedSeo(id: string) {
  const { data, error } = await supabase.from("photo_seo").select(photoSeoColumns).eq("id", id).maybeSingle();
  if (error) throw new Error("Couldn't load saved SEO details. Please try again.");
  if (!data) throw new Error("Saved details are not available to this account.");
  return { ...data, meta: imageMetaSchema.parse(data.metadata) };
}

export async function saveSeoForClaude(item: QueueItem) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in before saving SEO details for Claude.");
  const sameOwner = item.savedSeoOwner === user.id;
  const id = sameOwner && item.savedSeoId ? item.savedSeoId : crypto.randomUUID();
  const values = { custom_name: item.customName ?? null, metadata: { ...imageMetaSchema.parse(item.meta ?? {}) } };
  const query = sameOwner && item.savedSeoRevision !== undefined
    ? supabase.from("photo_seo").update(values).eq("id", id).eq("user_id", user.id).eq("revision", item.savedSeoRevision)
    : supabase.from("photo_seo").insert({ ...values, id, user_id: user.id, original_name: item.name });
  const { data, error } = await query.select(photoSeoColumns).maybeSingle();
  if (error) throw new Error("Couldn't save SEO details. Please try again.");
  if (!data) throw new Error("Claude changed these details. Load the latest version before saving.");
  return { id: data.id, revision: data.revision, owner: user.id };
}