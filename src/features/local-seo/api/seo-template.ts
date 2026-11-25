import { slugify, type SeoPatch } from "@/lib/seo-fields";
import { servicesOf, type BusinessProfile } from "./business-profile";

export const DEFAULT_PATTERN = "{keyword}-{city}-{n}";
export const PATTERN_TOKENS = ["{keyword}", "{city}", "{business}", "{subject}", "{original}", "{n}"] as const;

const STOP = new Set(
  "a an the and or of in on at to with for from by is are was were be been this that there these those it his her their its into over under near some two three several very image shows shown seen picture photo background front side middle top bottom left right located sitting standing".split(" ")
);

/** Up to `max` meaningful words from a caption, e.g. "a plumber fixing a sink" → ["plumber","fixing","sink"]. */
export function captionTerms(caption: string, max = 4): string[] {
  const words = caption.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set(words)].slice(0, max);
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function pickKeyword(services: string[], index: number, caption?: string): string {
  if (!services.length) return "";
  if (caption) {
    const words = new Set(captionTerms(caption, 20));
    const hit = services.find((s) => s.toLowerCase().split(/\s+/).some((w) => words.has(w)));
    if (hit) return hit;
  }
  return services[index % services.length];
}

export interface PhotoSeoInput {
  index: number;
  total: number;
  originalName: string;
  pattern: string;
  caption?: string;
}

/** Filename + SEO fields for one photo, built from the business profile (and an optional on-device caption). */
export function buildPhotoSeo(p: BusinessProfile, input: PhotoSeoInput): SeoPatch & { customName: string } {
  const keyword = pickKeyword(servicesOf(p), input.index, input.caption);
  const city = p.city.trim();
  const name = p.name.trim();
  const caption = input.caption?.trim().replace(/\.+$/, "");
  const n = String(input.index + 1).padStart(Math.max(2, String(input.total).length), "0");
  const subject = caption ? captionTerms(caption).join(" ") : "";

  const tokens: Record<string, string> = {
    keyword, city, business: name, subject, n,
    original: input.originalName.replace(/\.[^.]+$/, ""),
  };
  const raw = input.pattern.replace(/\{(\w+)\}/g, (_, t: string) => tokens[t] ?? "");
  const customName = slugify(raw) || slugify(`${name} ${city} ${n}`) || tokens.original;

  const lead = keyword ? capitalize(keyword) : name || "Photo";
  const title = [city ? `${lead} in ${city}` : lead, keyword && name ? name : ""].filter(Boolean).join(" | ");
  const description = caption
    ? `${capitalize(caption)}${city ? ` in ${city}` : ""}${name ? ` — ${name}` : ""}.`
    : [keyword ? capitalize(keyword) : "Photo", name && `by ${name}`, city && `in ${city}`].filter(Boolean).join(" ") + ".";
  // Keywords are comma-separated, so use the city without its ", ID" part.
  const town = city.split(",")[0].trim();
  const address = p.address.trim();
  const keywords = [...new Set(
    [keyword, keyword && town ? `${keyword} ${town}` : "", ...(caption ? captionTerms(caption, 3) : []), name, town]
      .map((k) => k.trim().toLowerCase()).filter(Boolean)
  )].join(", ");

  return {
    customName, title, description, keywords,
    location: address && town && !address.toLowerCase().includes(town.toLowerCase()) ? `${address}, ${city}` : address || city,
    latitude: p.latitude.trim(), longitude: p.longitude.trim(),
    ...(p.author?.trim() ? { author: p.author.trim() } : {}),
    ...(p.copyright?.trim() ? { copyright: p.copyright.trim() } : {}),
  };
}
