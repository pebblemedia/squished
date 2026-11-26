// Runs in a Web Worker so the editor stays responsive. Decodes with the browser
// (applies EXIF orientation), resizes, then encodes with jSquash WASM, falling
// back to the browser's own encoder for JPEG/WebP/PNG if WASM is unavailable.
import { wasmEncode, canvasEncode } from "./codecs.js";
import { readGps, writeGps } from "./gps.js";

const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
const KIND = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

const ascii = (b, at, len) => String.fromCharCode.apply(null, b.subarray(at, at + len));

function isAnimated(b, kind) {
  if (kind === "webp") return ascii(b, 12, 4) === "VP8X" && (b[20] & 0x02) !== 0;
  if (kind === "png") {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    for (let i = 8; i + 8 <= b.length; ) {
      const type = ascii(b, i + 4, 4);
      if (type === "acTL") return true;
      if (type === "IDAT") return false;
      i += 12 + dv.getUint32(i);
    }
  }
  return false;
}

function draw(bitmap, maxSide) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = maxSide > 0 && longest > maxSide ? maxSide / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, data: ctx.getImageData(0, 0, width, height) };
}

async function encode(kind, canvas, data, quality, wasmUrl) {
  try {
    return await wasmEncode(kind, data, quality, wasmUrl);
  } catch (err) {
    if (kind === "avif") return null; // Browsers' canvas encoders don't do AVIF.
    return canvasEncode(canvas, MIME[kind], quality);
  }
}

async function squish(job) {
  const source = KIND[job.type];
  if (!source) return { skip: "type" };
  const bytes = new Uint8Array(await job.blob.arrayBuffer());
  if (isAnimated(bytes, source)) return { skip: "animated" };

  const bitmap = await createImageBitmap(job.blob, { imageOrientation: "from-image" });
  const { canvas, data } = draw(bitmap, job.maxSide);
  bitmap.close();

  const wanted = job.format === "keep" ? source : job.format;
  let kind = wanted;
  let out = await encode(kind, canvas, data, job.quality, job.wasmUrl);
  if (!out && wanted !== source) {
    kind = source; // Browser can't encode the chosen format: keep the original one.
    out = await encode(kind, canvas, data, job.quality, job.wasmUrl);
  }
  if (!out) return { skip: "encode" };

  if (kind === "jpeg" && job.keepGps) {
    const gps = readGps(bytes);
    if (gps) out = writeGps(out, gps);
  }
  return { buffer: out.buffer, type: MIME[kind], width: data.width, height: data.height };
}

self.onmessage = async (e) => {
  const { id } = e.data;
  try {
    const result = await squish(e.data);
    self.postMessage({ id, ...result }, result.buffer ? [result.buffer] : []);
  } catch (err) {
    self.postMessage({ id, error: err && err.message ? err.message : String(err) });
  }
};
