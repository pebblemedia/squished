import { z } from "zod";
import type { FileKind, QueueItem, TargetFormat } from "@/lib/files";
import { fitFieldsFor, sizeLabel, type FitChoice } from "@/lib/fit";
import { DESTINATIONS_BY_SLUG } from "@/lib/destinations";
import type { BusinessProfile } from "@/features/local-seo/api/business-profile";

const IMAGE_FORMATS = ["original", "jpeg", "png", "webp", "avif", "strip"] as const;
const text = (max: number) => z.string().max(max);

const profileSchema = z.object({
  name: text(120), city: text(120), address: text(240), latitude: text(20), longitude: text(20),
  services: text(500), author: text(120).optional(), copyright: text(160).optional(),
});

const fitSchema = z.union([
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("size"), bytes: z.number().int().positive().max(50 * 1024 ** 3) }),
  z.object({ type: z.literal("dest"), slug: z.string().refine((s) => s in DESTINATIONS_BY_SLUG) }),
]);

/** What a recipe can carry. Validated on every load because shared links are untrusted input. */
export const recipeSchema = z.object({
  v: z.literal(1),
  name: text(80).min(1),
  imageFormat: z.enum(IMAGE_FORMATS).optional(),
  quality: z.number().min(0.1).max(1).optional(),
  fit: fitSchema.optional(),
  maxSide: z.number().int().min(64).max(16384).optional(),
  /** Leave audio, video and PDFs untouched (platform packs are for photos). */
  imagesOnly: z.boolean().optional(),
  seo: z.object({ profile: profileSchema, pattern: text(120) }).optional(),
});

export type RecipeData = z.infer<typeof recipeSchema>;
export interface Recipe extends RecipeData {
  id: string;
  /** Built-in spec packs can't be edited or deleted. */
  builtIn?: boolean;
  note?: string;
  source?: string;
}

const MB = 1024 * 1024;

/** Platform spec packs, checked against each platform's own help page on 2026-11-25. */
export const SPEC_PACKS: Recipe[] = [
  {
    id: "pack:gbp", builtIn: true, v: 1, name: "Google Business Profile photos",
    imageFormat: "jpeg", fit: { type: "dest", slug: "google-business-profile" }, imagesOnly: true,
    note: "JPG, 10 KB–5 MB, at least 250×250 px (720×720 recommended).",
    source: "https://support.google.com/business/answer/6103862",
  },
  {
    id: "pack:shopify", builtIn: true, v: 1, name: "Shopify product photos",
    imageFormat: "jpeg", fit: { type: "dest", slug: "shopify" }, maxSide: 2048, imagesOnly: true,
    note: "2048×2048 px displays best; under 20 MB, up to 5000×5000 px.",
    source: "https://help.shopify.com/en/manual/products/product-media/product-media-types",
  },
  {
    id: "pack:mls", builtIn: true, v: 1, name: "MLS listing photos",
    imageFormat: "jpeg", fit: { type: "size", bytes: 3 * MB }, maxSide: 1920, imagesOnly: true,
    note: "JPEG, 1920 px long edge, under 3 MB: fits strict MLS rules like MRED's. Check your own MLS.",
    source: "https://mredllc.freshdesk.com/support/solutions/articles/36000379999",
  },
];

type Defaults = Partial<Pick<QueueItem, "targetFormat" | "quality" | "targetBytes" | "maxWidth" | "maxHeight" | "fitLabel">>;

/** Queue settings a recipe gives a new file of this kind. Formats only apply to images. */
export function recipeDefaults(r: RecipeData, kind: FileKind): Defaults {
  if (r.imagesOnly && kind !== "image") return {};
  const out: Defaults = r.fit ? fitFieldsFor(r.fit as FitChoice, kind) : {};
  if (kind !== "image") return out;
  if (r.imageFormat) out.targetFormat = r.imageFormat as TargetFormat;
  if (r.quality) out.quality = r.quality;
  if (r.maxSide) {
    out.maxWidth = Math.min(out.maxWidth ?? Infinity, r.maxSide);
    out.maxHeight = Math.min(out.maxHeight ?? Infinity, r.maxSide);
  }
  return out;
}

const FORMAT_LABEL: Record<string, string> = {
  original: "Keep format", jpeg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF", strip: "Remove metadata",
};

/** One line, e.g. "JPEG · under 5 MB · 2048 px max · named & geotagged for Joe's Plumbing". */
export function describeRecipe(r: RecipeData): string {
  const fit = r.fit?.type === "size" ? `under ${sizeLabel(r.fit.bytes)}`
    : r.fit?.type === "dest" ? `fits ${DESTINATIONS_BY_SLUG[r.fit.slug]?.name ?? r.fit.slug}` : "";
  return [
    r.imageFormat && FORMAT_LABEL[r.imageFormat],
    fit,
    r.maxSide && `${r.maxSide} px max`,
    r.seo && `named & geotagged for ${r.seo.profile.name || r.seo.profile.city || "your business"}`,
  ].filter(Boolean).join(" · ");
}

export type RecipeProfile = z.infer<typeof profileSchema>;

export const profileForRecipe = (p: BusinessProfile): RecipeProfile => ({
  name: p.name, city: p.city, address: p.address, latitude: p.latitude, longitude: p.longitude,
  services: p.services, author: p.author, copyright: p.copyright,
});

/** The recipe's business as a full profile (missing fields become empty). */
export const recipeBusiness = (p: RecipeProfile): BusinessProfile => ({
  id: "recipe", name: p.name ?? "", city: p.city ?? "", address: p.address ?? "",
  latitude: p.latitude ?? "", longitude: p.longitude ?? "", services: p.services ?? "",
  author: p.author, copyright: p.copyright,
});
