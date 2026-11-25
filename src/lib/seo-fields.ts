import { z } from "zod";
import type { ImageMeta } from "./metadata";

export const seoFields = {
  title: z.string().optional().describe("Photo title."),
  description: z.string().optional().describe("Photo description / alt text."),
  keywords: z.string().optional().describe("Comma-separated keywords."),
  author: z.string().optional().describe("Photo author."),
  copyright: z.string().optional().describe("Copyright statement."),
  location: z.string().optional().describe("Location name or street address."),
  latitude: z.string().optional().describe("Latitude as entered in the photo details form."),
  longitude: z.string().optional().describe("Longitude as entered in the photo details form."),
};

export const imageMetaSchema = z.object(seoFields).strict();
export const seoPatchFields = {
  customName: z.string().optional().describe("Download filename without its extension; empty clears the custom name."),
  ...seoFields,
};
export const seoPatchSchema = z.object(seoPatchFields).strict();
export type SeoPatch = z.infer<typeof seoPatchSchema>;

export function photoDetailsPatch(originalName: string, current: ImageMeta | undefined, raw: unknown) {
  const parsed = seoPatchSchema.safeParse(raw);
  if (!parsed.success) throw new Error("SEO fields must be text, with no unknown fields.");
  if (!Object.values(parsed.data).some((value) => value !== undefined)) throw new Error("Supply at least one SEO field.");
  const { customName, ...fields } = parsed.data;
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return {
    ...(customName === undefined ? {} : {
      customName: customName.trim() && customName.trim() !== baseName ? customName.trim() : undefined,
    }),
    meta: { ...current, ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) },
  };
}

export const photoSeoColumns = "id,original_name,custom_name,metadata,revision,updated_at" as const;