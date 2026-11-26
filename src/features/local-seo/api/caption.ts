import type { CaptionReply, CaptionRequest } from "./caption-worker";

/** Approximate one-time model download, shown before the user opts in. */
export const MODEL_DOWNLOAD_MB = 280;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let loadWaiters: { resolve: () => void; reject: (e: Error) => void }[] = [];
let ready = false;
let onProgress: ((fraction: number) => void) | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./caption-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<CaptionReply>) => {
    const m = e.data;
    if (m.type === "progress") onProgress?.(m.total ? m.loaded / m.total : 0);
    else if (m.type === "ready") { ready = true; loadWaiters.forEach((w) => w.resolve()); loadWaiters = []; }
    else if (m.type === "caption") { pending.get(m.id)?.resolve(m.text); pending.delete(m.id); }
    else if (m.id !== undefined) { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
    else { loadWaiters.forEach((w) => w.reject(new Error(m.message))); loadWaiters = []; }
  };
  return worker;
}

/** Downloads (first time) and starts the on-device caption model. */
export function loadCaptioner(progress?: (fraction: number) => void): Promise<void> {
  onProgress = progress ?? null;
  if (ready) return Promise.resolve();
  return new Promise((resolve, reject) => {
    loadWaiters.push({ resolve, reject });
    getWorker().postMessage({ type: "load" } satisfies CaptionRequest);
  });
}

/** One-sentence description of a photo, generated on this device. */
export function describePhoto(blob: Blob): Promise<string> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type: "caption", id, blob } satisfies CaptionRequest);
  });
}

/** Keep alt text to the first sentence and a sensible length. */
export function tidyCaption(text: string): string {
  const first = text.replace(/\s+/g, " ").trim().split(/(?<=\.)\s/)[0] ?? "";
  const cleaned = first
    .replace(/^(in )?(the|this) (image|photo|picture)( we can see| shows| is of| depicts| contains)?[\s,]+/i, "")
    .replace(/^(there (is|are)|we can see)\s+/i, "")
    .replace(/\.$/, "");
  return cleaned.length > 140 ? cleaned.slice(0, 140).replace(/\s+\S*$/, "") : cleaned;
}
