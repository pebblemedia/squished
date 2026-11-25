import type { WorkerTarget, WorkerReply } from "./image-worker";

interface Pending {
  resolve: (v: { buffer: ArrayBuffer; resized: boolean }) => void;
  reject: (e: Error) => void;
  onProgress: (p: number) => void;
}

export interface FitOptions {
  fitBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface Job {
  blob: Blob;
  target: WorkerTarget;
  quality: number;
  fit?: FitOptions;
  pending: Pending;
}

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /Safari/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Android/.test(navigator.userAgent);

/** Safari/iOS canvases cap out around 16.7MP; elsewhere allow large camera/drone shots. */
const maxPixels = () => (isSafari() ? 16_777_216 : 64_000_000);

const poolSize = () =>
  Math.max(1, Math.min(4, (typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 2) - 1));

const workers: Worker[] = [];
const idle: Worker[] = [];
const queue: Job[] = [];
const inflight = new Map<number, Pending>();
const busy = new Map<Worker, number>();
let nextId = 1;

function spawn(): Worker {
  const w = new Worker(new URL("./image-worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (e: MessageEvent<WorkerReply>) => {
    const msg = e.data;
    const p = inflight.get(msg.id);
    if (!p) return;
    if (msg.type === "progress") return p.onProgress(msg.progress);
    inflight.delete(msg.id);
    busy.delete(w);
    if (msg.type === "done") p.resolve({ buffer: msg.buffer, resized: msg.resized });
    else p.reject(new Error(msg.message));
    idle.push(w);
    pump();
  };
  w.onerror = (e) => {
    const id = busy.get(w);
    busy.delete(w);
    workers.splice(workers.indexOf(w), 1);
    w.terminate();
    if (id !== undefined) {
      inflight.get(id)?.reject(new Error(e.message || "Image worker crashed"));
      inflight.delete(id);
    }
    pump();
  };
  workers.push(w);
  return w;
}

function pump() {
  while (queue.length) {
    const w = idle.pop() ?? (workers.length < poolSize() ? spawn() : undefined);
    if (!w) return;
    const job = queue.shift()!;
    const id = nextId++;
    inflight.set(id, job.pending);
    busy.set(w, id);
    w.postMessage({ id, blob: job.blob, target: job.target, quality: job.quality, maxPixels: maxPixels(), ...job.fit });
  }
}

export function encodeInWorker(
  blob: Blob,
  target: WorkerTarget,
  quality: number,
  onProgress: (p: number) => void,
  fit?: FitOptions
): Promise<{ buffer: ArrayBuffer; resized: boolean }> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return Promise.reject(new Error("Workers unavailable"));
  }
  return new Promise((resolve, reject) => {
    queue.push({ blob, target, quality, fit, pending: { resolve, reject, onProgress } });
    pump();
  });
}
