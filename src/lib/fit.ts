import type { FileKind, QueueItem } from "./files";
import { formatBytes } from "./files";
import { DESTINATIONS_BY_SLUG, type DestinationRule } from "./destinations";

export type FitChoice =
  | { type: "none" }
  | { type: "size"; bytes: number }
  | { type: "dest"; slug: string };

const KB = 1024;
const MB = 1024 * 1024;

export const SIZE_PRESETS = [
  20 * KB, 50 * KB, 100 * KB, 200 * KB, 500 * KB,
  1 * MB, 2 * MB, 5 * MB, 10 * MB, 25 * MB,
];

export const fitToValue = (c: FitChoice): string =>
  c.type === "none" ? "none" : c.type === "size" ? `size:${c.bytes}` : `dest:${c.slug}`;

export function valueToFit(v: string): FitChoice {
  if (v.startsWith("size:")) return { type: "size", bytes: Number(v.slice(5)) };
  if (v.startsWith("dest:")) return { type: "dest", slug: v.slice(5) };
  return { type: "none" };
}

/** Short size label: 100 KB, 2 MB, 25 MB. */
export const sizeLabel = (bytes: number) => formatBytes(bytes).replace(".0 ", " ");

/** The destination rule that applies to this kind of file, if any. */
export function ruleFor(slug: string, kind: FileKind): DestinationRule | undefined {
  const dest = DESTINATIONS_BY_SLUG[slug];
  if (!dest) return undefined;
  return dest.rules.find((r) => r.kind === kind) ?? dest.rules.find((r) => r.kind === "any");
}

type FitFields = Pick<QueueItem, "targetBytes" | "maxWidth" | "maxHeight" | "fitLabel">;

const CLEAR: FitFields = { targetBytes: undefined, maxWidth: undefined, maxHeight: undefined, fitLabel: undefined };

/** Queue fields for a fit choice on a file of this kind. Destinations without a rule for it clear the fit. */
export function fitFieldsFor(choice: FitChoice, kind: FileKind): FitFields {
  if (choice.type === "size") return { ...CLEAR, targetBytes: choice.bytes, fitLabel: sizeLabel(choice.bytes) };
  if (choice.type === "dest") {
    const rule = ruleFor(choice.slug, kind);
    const dest = DESTINATIONS_BY_SLUG[choice.slug];
    if (!rule || !dest) return CLEAR;
    return {
      targetBytes: rule.maxBytes,
      maxWidth: kind === "image" ? rule.maxWidth : undefined,
      maxHeight: kind === "image" ? rule.maxHeight : undefined,
      fitLabel: dest.name,
    };
  }
  return CLEAR;
}

/** The choice an item currently carries, for showing in a picker. */
export function currentFit(item: Pick<QueueItem, "targetBytes" | "fitLabel">): FitChoice {
  if (!item.targetBytes && !item.fitLabel) return { type: "none" };
  const dest = Object.values(DESTINATIONS_BY_SLUG).find((d) => d.name === item.fitLabel);
  if (dest) return { type: "dest", slug: dest.slug };
  return item.targetBytes ? { type: "size", bytes: item.targetBytes } : { type: "none" };
}

/** Which file kinds a destination has rules for (drives which destinations a picker shows). */
export function destinationKinds(slug: string): Set<FileKind | "any"> {
  return new Set(DESTINATIONS_BY_SLUG[slug]?.rules.map((r) => r.kind) ?? []);
}
