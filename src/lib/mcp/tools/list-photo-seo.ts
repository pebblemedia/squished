import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_photo_seo",
  title: "List saved photo SEO details",
  description: "List only your explicitly saved photo SEO records; original photos and browser-only uploads are not accessible.",
  inputSchema: {
    offset: z.number().int().min(0).default(0).describe("Pagination offset; begin with zero."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum number of records to return, up to 100."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ offset, limit }, ctx) => {
    const client = await supabaseForUser(ctx);
    const { data, error } = await client.from("photo_seo").select("id,original_name,custom_name,revision,updated_at")
      .eq("user_id", ctx.getUserId()).order("updated_at", { ascending: false }).order("id").range(offset, offset + limit - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Couldn't list saved SEO details. Try again.");
    const photos = (data ?? []).map((row) => ({ id: row.id, originalName: row.original_name, customName: row.custom_name, revision: row.revision, updatedAt: row.updated_at }));
    return {
      content: [{ type: "text", text: photos.length ? photos.map((photo) => `${photo.id}: ${photo.customName ?? photo.originalName} (revision ${photo.revision})`).join("\n") : "No saved photo SEO details. Save a photo's details for Claude in Squished first." }],
      structuredContent: { photos, nextOffset: photos.length === limit ? offset + limit : null },
    };
  },
});