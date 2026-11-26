import { DESTINATIONS, DESTINATIONS_BY_SLUG } from "../../../src/lib/destinations";
import type { Format } from "./codecs.js";

export interface FitSpec {
  bytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  label: string;
}

const UNITS: Record<string, number> = { "": 1, b: 1, k: 1024, kb: 1024, m: 1024 ** 2, mb: 1024 ** 2, g: 1024 ** 3, gb: 1024 ** 3 };

/** "100kb", "2mb", "1.5 MB", "50000" → bytes (1 KB = 1024 bytes, like the web app). */
export function parseSize(s: string): number | undefined {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(s);
  if (!m) return undefined;
  const unit = UNITS[m[2].toLowerCase()];
  return unit ? Math.round(Number(m[1]) * unit) : undefined;
}

/** A size like "100kb" or a destination slug like "etsy". */
export function resolveFit(value: string | number | undefined): FitSpec | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "number") return { bytes: value, label: sizeLabel(value) };
  const bytes = parseSize(value);
  if (bytes) return { bytes, label: sizeLabel(bytes) };
  const dest = DESTINATIONS_BY_SLUG[value.toLowerCase()];
  if (!dest) {
    throw new Error(`Unknown size or destination "${value}". Try 100kb, 2mb, or run "squished limits".`);
  }
  const rule = dest.rules.find((r) => r.kind === "image") ?? dest.rules.find((r) => r.kind === "any");
  if (!rule) throw new Error(`${dest.name} has no image limit.`);
  return { bytes: rule.maxBytes, maxWidth: rule.maxWidth, maxHeight: rule.maxHeight, label: dest.name };
}

export const FORMATS: Format[] = ["jpeg", "png", "webp", "avif"];

export function parseFormat(s: string | undefined): Format | undefined {
  if (!s) return undefined;
  const f = s.toLowerCase() === "jpg" ? "jpeg" : s.toLowerCase();
  if (!FORMATS.includes(f as Format)) throw new Error(`--to must be one of ${FORMATS.join(", ")}`);
  return f as Format;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Short size label: 100 KB, 2 MB, 25 MB. */
export const sizeLabel = (bytes: number) => formatBytes(bytes).replace(".0 ", " ");

export interface LimitRow {
  slug: string;
  name: string;
  group: string;
  rules: { kind: string; maxBytes?: number; maxWidth?: number; maxHeight?: number; label?: string }[];
  note?: string;
  source: string;
}

/** Destinations whose slug, name or group matches the query. */
export function listLimits(query?: string): LimitRow[] {
  const q = query?.trim().toLowerCase();
  return DESTINATIONS.filter(
    (d) => !q || d.slug.includes(q) || d.name.toLowerCase().includes(q) || d.group.includes(q),
  ).map(({ slug, name, group, rules, note, source }) => ({ slug, name, group, rules, note, source }));
}
