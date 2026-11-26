// Compresses one image file on disk. Everything runs locally; nothing is uploaded.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { stripMetadata } from "../../../src/lib/strip-metadata";
import { EXT, decode, encode, optimisePng, sniff, type Format } from "./codecs.js";
import { fit, pixelsAt } from "./fit.js";
import { applyOrientation, jpegOrientation } from "./orientation.js";
import { parseFormat, resolveFit } from "./options.js";

export interface SquishOptions {
  /** Output format; defaults to the input's. */
  to?: Format | "jpg";
  /** 1–100. Default 75; caps the search in fit mode (default 92 there). */
  quality?: number;
  /** Target size ("100kb", "2mb", bytes) or a destination slug ("etsy"). */
  fit?: string | number;
  /** Longest side in pixels. */
  maxSide?: number;
  /** Lossless metadata removal (GPS, camera, timestamps). Keeps orientation and colour profile. */
  strip?: boolean;
  /** Output folder; defaults to the input's folder. */
  outDir?: string;
  /** Added before the extension. Default "-squished". */
  suffix?: string;
}

export interface SquishResult {
  input: string;
  output: string;
  before: number;
  after: number;
  /** Fraction saved, 0–1 (negative if bigger). */
  saved: number;
  format: Format;
  width?: number;
  height?: number;
  resized: boolean;
  note?: string;
}

const MAX_PIXELS = 64_000_000;
const DEFAULT_QUALITY = 75;
/** Best quality fit mode aims for; above this, files grow fast for no visible gain. */
const FIT_MAX_QUALITY = 92;

function startScale(w: number, h: number, limits: { maxWidth?: number; maxHeight?: number; maxSide?: number }) {
  const px = w * h;
  return Math.min(
    1,
    px > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / px) : 1,
    limits.maxWidth ? limits.maxWidth / w : 1,
    limits.maxHeight ? limits.maxHeight / h : 1,
    limits.maxSide ? limits.maxSide / Math.max(w, h) : 1,
  );
}

const clampQ = (q: number) => Math.max(1, Math.min(100, q)) / 100;

async function strip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array | null> {
  const blob = await stripMetadata(new Blob([bytes]));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

export function outputPath(input: string, format: Format, sameFormat: boolean, opts: SquishOptions): string {
  const ext = extname(input);
  const base = basename(input, ext);
  const outExt = sameFormat && ext ? ext : `.${EXT[format]}`;
  const out = resolve(join(opts.outDir ?? dirname(input), `${base}${opts.suffix ?? "-squished"}${outExt}`));
  if (out === resolve(input)) throw new Error("Refusing to overwrite the original. Use --suffix or --out.");
  return out;
}

export async function squishFile(path: string, opts: SquishOptions = {}): Promise<SquishResult> {
  const input = resolve(path);
  const bytes = new Uint8Array(await readFile(input)) as Uint8Array<ArrayBuffer>;
  const source = sniff(bytes);
  if (!source) throw new Error("Not a JPEG, PNG, WebP or AVIF file.");
  const target = parseFormat(opts.to) ?? source;
  const same = target === source;
  const spec = resolveFit(opts.fit);
  const output = outputPath(input, target, same, opts);

  const done = async (out: Uint8Array, extra: Partial<SquishResult> = {}): Promise<SquishResult> => {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, out);
    const after = out.byteLength;
    return { input, output, before: bytes.byteLength, after, saved: 1 - after / bytes.byteLength, format: target, resized: false, ...extra };
  };

  const original = async () => (opts.strip ? (await strip(bytes)) ?? bytes : bytes);

  // --strip on its own: rewrite the container, never re-encode.
  if (opts.strip && same && opts.quality === undefined && !spec && !opts.maxSide) {
    const cleaned = await strip(bytes);
    if (!cleaned) throw new Error("AVIF metadata can't be removed losslessly. Add --to to re-encode it.");
    return done(cleaned, { note: "metadata removed" });
  }

  // Already small enough and no dimension rules? Keep it as is: no quality loss.
  if (spec?.bytes && same && !spec.maxWidth && !spec.maxHeight && !opts.maxSide) {
    const kept = await original();
    if (kept.byteLength <= spec.bytes) return done(kept, { note: `already under ${spec.label}` });
  }

  let pixels = await decode(bytes, source);
  if (source === "jpeg") pixels = applyOrientation(pixels, jpegOrientation(bytes));
  const scale = startScale(pixels.width, pixels.height, { ...spec, maxSide: opts.maxSide });

  let encoded: ArrayBuffer;
  let final = { scale, width: pixels.width, height: pixels.height };
  let note: string | undefined;
  if (spec?.bytes) {
    const maxQ = clampQ(opts.quality ?? FIT_MAX_QUALITY);
    const r = await fit(pixels, target, maxQ, spec.bytes, scale);
    encoded = r.buffer;
    final = r;
    note = target === "png" ? `fit ${spec.label}` : `fit ${spec.label} at quality ${Math.round(r.quality * 100)}`;
  } else if (target === "png" && source === "png" && scale >= 1) {
    encoded = await optimisePng(bytes); // lossless; quality doesn't apply
  } else {
    const data = await pixelsAt(pixels, scale);
    encoded = await encode(data, target, clampQ(opts.quality ?? DEFAULT_QUALITY));
    final = { scale, width: data.width, height: data.height };
  }

  const resized = final.scale < 1;
  const dims = { width: final.width, height: final.height, resized };
  // Never hand back a bigger file when the format is unchanged.
  if (!resized && same && encoded.byteLength >= bytes.byteLength) {
    const kept = await original();
    if (kept.byteLength <= encoded.byteLength) {
      return done(kept, { ...dims, note: opts.strip ? "kept original, metadata removed" : "kept original" });
    }
  }
  if (resized) note = [note, `resized to ${final.width}×${final.height}`].filter(Boolean).join(", ");
  return done(new Uint8Array(encoded), { ...dims, note });
}
