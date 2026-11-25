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
}

export type WorkerReply =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "done"; buffer: ArrayBuffer; resized: boolean }
  | { id: number; type: "error"; message: string };

const post = (msg: WorkerReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

async function decode(blob: Blob, maxPixels: number) {
  const bitmap = await createImageBitmap(blob);
  const pixels = bitmap.width * bitmap.height;
  const scale = pixels > maxPixels ? Math.sqrt(maxPixels / pixels) : 1;
  const width = Math.max(1, Math.floor(bitmap.width * scale));
  const height = Math.max(1, Math.floor(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2D is unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { data: ctx.getImageData(0, 0, width, height), resized: scale < 1 };
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

self.onmessage = async (e: MessageEvent<EncodeJob>) => {
  const { id, blob, target, quality, maxPixels } = e.data;
  try {
    post({ id, type: "progress", progress: 10 });
    if (target === "png-optimise") {
      const { default: optimise } = await import("@jsquash/oxipng/optimise");
      const buffer = await optimise(await blob.arrayBuffer(), { level: 2 });
      return post({ id, type: "done", buffer, resized: false }, [buffer]);
    }
    const { data, resized } = await decode(blob, maxPixels);
    post({ id, type: "progress", progress: 40 });
    const buffer = await encode(data, target, quality);
    post({ id, type: "done", buffer, resized }, [buffer]);
  } catch (err) {
    post({ id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
