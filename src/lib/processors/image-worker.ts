/// <reference lib="webworker" />
// Decodes with the browser (keeps EXIF orientation, converts to sRGB), then
// encodes with jSquash WASM codecs. Codecs load lazily, once per worker.

export type EncodeTarget = "jpeg" | "png" | "webp" | "avif";
/** "png-optimise" takes an existing PNG and recompresses it losslessly without decoding. */
export type WorkerTarget = EncodeTarget | "png-optimise";

export interface EncodeJob {
  id: number;
  blob: Blob;
  target: WorkerTarget;
  quality: number;
  maxPixels: number;
  /** Search quality (then dimensions) for the best result at or under this size. */
  fitBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type WorkerReply =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "done"; buffer: ArrayBuffer; resized: boolean }
  | { id: number; type: "error"; message: string };

const post = (msg: WorkerReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

function startScale(b: ImageBitmap, job: EncodeJob): number {
  const pixels = b.width * b.height;
  return Math.min(
    1,
    pixels > job.maxPixels ? Math.sqrt(job.maxPixels / pixels) : 1,
    job.maxWidth ? job.maxWidth / b.width : 1,
    job.maxHeight ? job.maxHeight / b.height : 1
  );
}

function pixelsAt(bitmap: ImageBitmap, scale: number): ImageData {
  const width = Math.max(1, Math.floor(bitmap.width * scale));
  const height = Math.max(1, Math.floor(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2D is unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

async function encode(data: ImageData, target: EncodeTarget, quality: number): Promise<ArrayBuffer> {
  const q = Math.round(quality * 100);
  switch (target) {
    case "jpeg": {
      const { default: enc } = await import("@jsquash/jpeg/encode");
      return enc(data, { quality: q });
    }
    case "webp": {
      const { default: enc } = await import("@jsquash/webp/encode");
      return enc(data, { quality: q });
    }
    case "avif": {
      const { default: enc } = await import("@jsquash/avif/encode");
      // AVIF looks much better than JPEG at the same number, so shift the scale down.
      return enc(data, { quality: Math.max(10, Math.min(100, q - 20)), speed: 7 });
    }
    case "png": {
      const { default: optimise } = await import("@jsquash/oxipng/optimise");
      return optimise(data, { level: 2 });
    }
  }
}

/** Highest quality that fits; shrinks dimensions only when the lowest quality still doesn't. */
async function fit(
  bitmap: ImageBitmap,
  target: EncodeTarget,
  maxQ: number,
  limit: number,
  scale: number,
  progress: (p: number) => void
): Promise<{ buffer: ArrayBuffer; scale: number }> {
  const MIN_Q = 0.1;
  for (let round = 0; round < 6; round++) {
    const data = pixelsAt(bitmap, scale);
    if (target === "png") {
      const buf = await encode(data, "png", 1);
      if (buf.byteLength <= limit) return { buffer: buf, scale };
      scale *= Math.sqrt(limit / buf.byteLength) * 0.95;
      continue;
    }
    const top = await encode(data, target, maxQ);
    if (top.byteLength <= limit) return { buffer: top, scale };
    const floor = await encode(data, target, MIN_Q);
    if (floor.byteLength > limit) {
      scale *= Math.sqrt(limit / floor.byteLength) * 0.95;
      progress(Math.min(90, 20 + round * 10));
      continue;
    }
    // Size grows roughly exponentially with quality, so interpolate in log space:
    // usually lands within a few percent of the limit in 2–3 encodes.
    let best = floor;
    let lo = MIN_Q, loSize = floor.byteLength;
    let hi = maxQ, hiSize = top.byteLength;
    for (let i = 0; i < 4; i++) {
      const t = (Math.log(limit * 0.97) - Math.log(loSize)) / (Math.log(hiSize) - Math.log(loSize));
      const span = hi - lo;
      const q = Math.min(hi - span * 0.1, Math.max(lo + span * 0.1, lo + span * t));
      const buf = await encode(data, target, q);
      if (buf.byteLength <= limit) {
        best = buf; lo = q; loSize = buf.byteLength;
        if (buf.byteLength >= limit * 0.93) break;
      } else {
        hi = q; hiSize = buf.byteLength;
      }
      progress(Math.min(95, 50 + i * 12));
    }
    return { buffer: best, scale };
  }
  throw new Error("Couldn't get this image under the size limit.");
}

self.onmessage = async (e: MessageEvent<EncodeJob>) => {
  const job = e.data;
  const { id, blob, target, quality, fitBytes } = job;
  try {
    post({ id, type: "progress", progress: 10 });
    if (target === "png-optimise") {
      const { default: optimise } = await import("@jsquash/oxipng/optimise");
      const buffer = await optimise(await blob.arrayBuffer(), { level: 2 });
      return post({ id, type: "done", buffer, resized: false }, [buffer]);
    }
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = startScale(bitmap, job);
      post({ id, type: "progress", progress: 30 });
      if (fitBytes) {
        const r = await fit(bitmap, target, quality, fitBytes, scale, (p) => post({ id, type: "progress", progress: p }));
        return post({ id, type: "done", buffer: r.buffer, resized: r.scale < 1 }, [r.buffer]);
      }
      const buffer = await encode(pixelsAt(bitmap, scale), target, quality);
      post({ id, type: "done", buffer, resized: scale < 1 }, [buffer]);
    } finally {
      bitmap.close();
    }
  } catch (err) {
    post({ id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
