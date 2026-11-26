import { ensure } from "./wasm.js";

export type Format = "jpeg" | "png" | "webp" | "avif";

export const EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));

/** Sniffs the format from the file's first bytes. */
export function sniff(b: Uint8Array): Format | undefined {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (ascii(b, 4, 4) === "ftyp" && /^avi[fs]$/.test(ascii(b, 8, 4))) return "avif";
  return undefined;
}

const toBuffer = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export async function decode(bytes: Uint8Array, format: Format): Promise<ImageData> {
  const buf = toBuffer(bytes);
  switch (format) {
    case "jpeg": {
      await ensure.jpegDec();
      const { default: dec } = await import("@jsquash/jpeg/decode");
      return dec(buf);
    }
    case "png": {
      await ensure.png();
      const { default: dec } = await import("@jsquash/png/decode");
      return dec(buf) as Promise<ImageData>;
    }
    case "webp": {
      await ensure.webpDec();
      const { default: dec } = await import("@jsquash/webp/decode");
      return dec(buf);
    }
    case "avif": {
      await ensure.avifDec();
      const { default: dec } = await import("@jsquash/avif/decode");
      const out = await dec(buf);
      if (!out) throw new Error("Couldn't decode AVIF");
      return out as ImageData;
    }
  }
}

/** Same quality mapping as the web app's image worker (quality is 0–1). */
export async function encode(data: ImageData, target: Format, quality: number): Promise<ArrayBuffer> {
  const q = Math.round(quality * 100);
  switch (target) {
    case "jpeg": {
      await ensure.jpegEnc();
      const { default: enc } = await import("@jsquash/jpeg/encode");
      return enc(data, { quality: q });
    }
    case "webp": {
      await ensure.webpEnc();
      const { default: enc } = await import("@jsquash/webp/encode");
      return enc(data, { quality: q });
    }
    case "avif": {
      await ensure.avifEnc();
      const { default: enc } = await import("@jsquash/avif/encode");
      // AVIF looks much better than JPEG at the same number, so shift the scale down.
      return enc(data, { quality: Math.max(10, Math.min(100, q - 20)), speed: 7 });
    }
    case "png": {
      await ensure.oxipng();
      const { default: optimise } = await import("@jsquash/oxipng/optimise");
      return optimise(data, { level: 2 });
    }
  }
}

/** Lossless PNG recompression straight from the file bytes. */
export async function optimisePng(bytes: Uint8Array): Promise<ArrayBuffer> {
  await ensure.oxipng();
  const { default: optimise } = await import("@jsquash/oxipng/optimise");
  return optimise(toBuffer(bytes), { level: 2 });
}

export async function resize(data: ImageData, width: number, height: number): Promise<ImageData> {
  if (width === data.width && height === data.height) return data;
  await ensure.resize();
  const { default: rs } = await import("@jsquash/resize");
  // Copy: resize may reuse the input buffer, and we resize the same source more than once.
  const copy = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  return rs(copy, { width, height, method: "lanczos3", premultiply: true, linearRGB: true });
}
