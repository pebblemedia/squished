// jSquash can't fetch its .wasm files in Node, so we read them from disk and
// hand each codec a compiled module. Codecs initialise lazily, once each.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

class NodeImageData {
  readonly colorSpace = "srgb";
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}

const g = globalThis as { ImageData?: unknown };
if (typeof g.ImageData === "undefined") g.ImageData = NodeImageData;

let wasmDir: string | undefined;

/** Where the bundled .wasm files live. Needed when this code is re-bundled (e.g. Raycast). */
export function configure(opts: { wasmDir: string }) {
  wasmDir = opts.wasmDir;
}

function dir(): string {
  if (wasmDir) return wasmDir;
  try {
    return join(dirname(fileURLToPath(import.meta.url)), "wasm");
  } catch {
    throw new Error("squished: call configure({ wasmDir }) before compressing.");
  }
}

const compile = async (file: string) => WebAssembly.compile(new Uint8Array(await readFile(join(dir(), file))));

const ready = new Map<string, Promise<unknown>>();
function once(key: string, start: () => Promise<unknown>) {
  if (!ready.has(key)) ready.set(key, start());
  return ready.get(key)!;
}

export const WASM_FILES: Record<string, string> = {
  "mozjpeg_enc.wasm": "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
  "mozjpeg_dec.wasm": "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
  "webp_enc_simd.wasm": "@jsquash/webp/codec/enc/webp_enc_simd.wasm",
  "webp_dec.wasm": "@jsquash/webp/codec/dec/webp_dec.wasm",
  "avif_enc.wasm": "@jsquash/avif/codec/enc/avif_enc.wasm",
  "avif_dec.wasm": "@jsquash/avif/codec/dec/avif_dec.wasm",
  "squoosh_png_bg.wasm": "@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
  "squoosh_oxipng_bg.wasm": "@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm",
  "squoosh_resize_bg.wasm": "@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm",
};

type Init = (m: WebAssembly.Module) => unknown;
const load = (key: string, file: string, mod: () => Promise<{ init: Init }>) =>
  once(key, async () => {
    const [m, wasm] = await Promise.all([mod(), compile(file)]);
    await m.init(wasm);
  });

export const ensure = {
  jpegEnc: () => load("jpegEnc", "mozjpeg_enc.wasm", () => import("@jsquash/jpeg/encode")),
  jpegDec: () => load("jpegDec", "mozjpeg_dec.wasm", () => import("@jsquash/jpeg/decode")),
  webpEnc: () => load("webpEnc", "webp_enc_simd.wasm", () => import("@jsquash/webp/encode")),
  webpDec: () => load("webpDec", "webp_dec.wasm", () => import("@jsquash/webp/decode")),
  avifEnc: () => load("avifEnc", "avif_enc.wasm", () => import("@jsquash/avif/encode")),
  avifDec: () => load("avifDec", "avif_dec.wasm", () => import("@jsquash/avif/decode")),
  png: () =>
    once("png", async () => {
      const wasm = await compile("squoosh_png_bg.wasm");
      const [enc, dec] = await Promise.all([import("@jsquash/png/encode"), import("@jsquash/png/decode")]);
      await Promise.all([enc.init(wasm), dec.init(wasm)]);
    }),
  oxipng: () => load("oxipng", "squoosh_oxipng_bg.wasm", () => import("@jsquash/oxipng/optimise")),
  resize: () =>
    once("resize", async () => {
      const { initResize } = await import("@jsquash/resize");
      await initResize(await compile("squoosh_resize_bg.wasm"));
    }),
};
