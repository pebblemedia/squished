import { environment } from "@raycast/api";
import { join } from "node:path";
import { configure, formatBytes, squishFile, type SquishOptions } from "squished";

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

export const isImage = (path: string) => IMAGE.test(path);

export interface Summary {
  done: number;
  failed: string[];
  before: number;
  after: number;
}

/** Compresses files one after another on this Mac and totals the savings. */
export async function squishPaths(
  paths: string[],
  opts: SquishOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Summary> {
  configure({ wasmDir: join(environment.assetsPath, "wasm") });
  const summary: Summary = { done: 0, failed: [], before: 0, after: 0 };
  for (const [i, path] of paths.entries()) {
    onProgress?.(i, paths.length);
    try {
      const r = await squishFile(path, opts);
      summary.done++;
      summary.before += r.before;
      summary.after += r.after;
    } catch (err) {
      summary.failed.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return summary;
}

export function summaryText(s: Summary): string {
  const failed = s.failed.length ? `, ${s.failed.length} failed` : "";
  if (!s.done) return `Couldn't squish ${s.failed.length === 1 ? "that image" : "those images"}`;
  const pct = s.before ? Math.round((1 - s.after / s.before) * 100) : 0;
  const saved = Math.max(0, s.before - s.after);
  return `Saved ${formatBytes(saved)} (${pct}%) on ${s.done} image${s.done === 1 ? "" : "s"}${failed}`;
}
