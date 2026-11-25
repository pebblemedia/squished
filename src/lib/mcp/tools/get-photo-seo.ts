import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { photoSeoJson, readPhotoSeo } from "../photo-seo";

export default defineTool({
  name: "get_photo_seo",
  title: "Read photo SEO fields",
  description: "Read every saved SEO field and current revision of a photo belonging to your account.",
  inputSchema: { id: z.string().uuid().describe("Photo SEO record ID from list_photo_seo." ) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const client = await supabaseForUser(ctx);
    const photo = photoSeoJson(await readPhotoSeo(client, ctx.getUserId() ?? "", id, ctx.signal));
    return { content: [{ type: "text", text: JSON.stringify(photo) }], structuredContent: { photo } };
  },
});