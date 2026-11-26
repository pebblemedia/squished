// jSquash WASM encoders, loaded lazily from the plugin's own assets/wasm/ folder.
// The WASM is fetched from the WordPress site itself, never a CDN.
import mozjpeg from "@jsquash/jpeg/codec/enc/mozjpeg_enc.js";
import { defaultOptions as jpegDefaults } from "@jsquash/jpeg/meta.js";
import webpPlain from "@jsquash/webp/codec/enc/webp_enc.js";
import webpSimd from "@jsquash/webp/codec/enc/webp_enc_simd.js";
import { defaultOptions as webpDefaults } from "@jsquash/webp/meta.js";
import avifEnc from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions as avifDefaults } from "@jsquash/avif/meta.js";
import { initSync as oxipngInit, optimise_raw } from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
import { initEmscriptenModule } from "@jsquash/jpeg/utils.js";
import { simd } from "wasm-feature-detect";

const loaded = {};

async function compile(base, file) {
  const res = await fetch(base + file, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Could not load ${file}`);
  // arrayBuffer + compile works even when the server sends the wrong MIME type for .wasm.
  return WebAssembly.compile(await res.arrayBuffer());
}

async function emscripten(base, factory, file) {
  return initEmscriptenModule(factory, await compile(base, file));
}

function load(kind, base) {
  if (!loaded[kind]) {
    loaded[kind] = (async () => {
      switch (kind) {
        case "jpeg":
          return emscripten(base, mozjpeg, "mozjpeg_enc.wasm");
        case "webp":
          return (await simd())
            ? emscripten(base, webpSimd, "webp_enc_simd.wasm")
            : emscripten(base, webpPlain, "webp_enc.wasm");
        case "avif":
          return emscripten(base, avifEnc, "avif_enc.wasm");
        case "png":
          oxipngInit(await compile(base, "squoosh_oxipng_bg.wasm"));
          return { encode: (d, w, h) => optimise_raw(d, w, h, 2, false, false) };
      }
    })();
    loaded[kind].catch(() => delete loaded[kind]);
  }
  return loaded[kind];
}

/**
 * Encodes ImageData with WASM. Quality is 1–100; AVIF is shifted down because it
 * looks better than JPEG at the same number (same mapping as squished.app).
 */
export async function wasmEncode(kind, data, quality, base) {
  const codec = await load(kind, base);
  const { width: w, height: h } = data;
  let out;
  if (kind === "jpeg") out = codec.encode(data.data, w, h, { ...jpegDefaults, quality });
  if (kind === "webp") out = codec.encode(data.data, w, h, { ...webpDefaults, quality });
  if (kind === "avif") {
    const q = Math.max(10, Math.min(100, quality - 20));
    out = codec.encode(new Uint8Array(data.data.buffer), w, h, { ...avifDefaults, quality: q, speed: 7 });
  }
  if (kind === "png") out = codec.encode(data.data, w, h);
  if (!out || !out.byteLength) throw new Error("Encoding failed");
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength).slice();
}

/** Browser-native fallback. Returns null when the browser can't produce that type. */
export async function canvasEncode(canvas, mime, quality) {
  const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 });
  return blob.type === mime ? new Uint8Array(await blob.arrayBuffer()) : null;
}
