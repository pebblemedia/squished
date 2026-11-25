import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { seoPatchFields } from "../../seo-fields";
import { supabaseForUser } from "../supabase";
import { photoSeoJson, updatePhotoSeo } from "../photo-seo";

export default defineTool({
  name: "update_photo_seo",
  title: "Fill photo SEO fields",
  description: "Update a saved photo's filename and any SEO fields as the signed-in owner; omitted fields stay unchanged and empty text clears a field.",
  inputSchema: {
    id: z.string().uuid().describe("Photo SEO record ID from list_photo_seo."),
    revision: z.number().int().min(1).describe("Latest revision from get_photo_seo; stale revisions are refused."),
    ...seoPatchFields,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, revision, ...fields }, ctx) => {
    const client = await supabaseForUser(ctx);
    const photo = photoSeoJson(await updatePhotoSeo(client, ctx.getUserId() ?? "", id, revision, fields, ctx.signal));
    return {
      content: [{ type: "text", text: "Saved photo SEO fields. In Squished, load the latest saved details before downloading. Original photos remain in the browser; embedded metadata is written to JPEG downloads only." }],
      structuredContent: { photo },
    };
  },
});