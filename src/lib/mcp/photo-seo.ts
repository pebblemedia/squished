import type { SupabaseClient } from "@supabase/supabase-js";
import { ToolError } from "@lovable.dev/mcp-js";
import type { Database } from "../../integrations/supabase/types";
import { imageMetaSchema, photoDetailsPatch, photoSeoColumns, type SeoPatch } from "../seo-fields";

export async function readPhotoSeo(client: SupabaseClient<Database>, userId: string, id: string, signal?: AbortSignal) {
  let query = client.from("photo_seo").select(photoSeoColumns).eq("user_id", userId).eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw new ToolError("Couldn't read saved SEO details. Try again.");
  if (!data) throw new ToolError("Photo SEO details were not found or are not accessible to your account.");
  return data;
}

export async function updatePhotoSeo(client: SupabaseClient<Database>, userId: string, id: string, revision: number, fields: SeoPatch, signal?: AbortSignal) {
  const existing = await readPhotoSeo(client, userId, id, signal);
  if (existing.revision !== revision) throw new ToolError("These details changed. Read the latest details and retry with their revision.");
  const patch = photoDetailsPatch(existing.original_name, imageMetaSchema.parse(existing.metadata), fields);
  let query = client.from("photo_seo").update({
    metadata: { ...patch.meta },
    ...(Object.prototype.hasOwnProperty.call(patch, "customName") ? { custom_name: patch.customName ?? null } : {}),
  }).eq("user_id", userId).eq("id", id).eq("revision", revision);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.select(photoSeoColumns).maybeSingle();
  if (error) throw new ToolError("Couldn't update saved SEO details. Try again.");
  if (!data) throw new ToolError("These details changed. Read the latest details before retrying.");
  return data;
}

export function photoSeoJson(row: { id: string; original_name: string; custom_name: string | null; metadata: unknown; revision: number; updated_at: string }) {
  const meta = imageMetaSchema.parse(row.metadata);
  return {
    id: row.id, originalName: row.original_name, customName: row.custom_name,
    revision: row.revision, updatedAt: row.updated_at,
    title: meta.title ?? "", description: meta.description ?? "", keywords: meta.keywords ?? "",
    author: meta.author ?? "", copyright: meta.copyright ?? "", location: meta.location ?? "",
    latitude: meta.latitude ?? "", longitude: meta.longitude ?? "",
  };
}