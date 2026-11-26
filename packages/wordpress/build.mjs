// Builds squished/assets (uploader.js, worker.js, wasm/) and zips the plugin to dist/squished.zip.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const plugin = join(root, "squished");
const assets = join(plugin, "assets");
const nm = join(root, "node_modules");

const wasm = [
  "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
  "@jsquash/webp/codec/enc/webp_enc.wasm",
  "@jsquash/webp/codec/enc/webp_enc_simd.wasm",
  "@jsquash/avif/codec/enc/avif_enc.wasm",
  "@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm",
];

const licenses = {
  "jsquash.txt": "@jsquash/jpeg/LICENSE",
  "mozjpeg.md": "@jsquash/jpeg/codec/LICENSE.codec.md",
  "libwebp.md": "@jsquash/webp/codec/LICENSE.codec.md",
  "oxipng.md": "@jsquash/oxipng/codec/LICENSE.codec.md",
  "piexifjs.txt": "piexifjs/LICENSE.txt",
  "wasm-feature-detect.txt": "wasm-feature-detect/LICENSE",
};

rmSync(join(assets, "wasm"), { recursive: true, force: true });
rmSync(join(assets, "licenses"), { recursive: true, force: true });
mkdirSync(join(assets, "wasm"), { recursive: true });
mkdirSync(join(assets, "licenses"), { recursive: true });
for (const f of wasm) cpSync(join(nm, f), join(assets, "wasm", f.split("/").pop()));
for (const [to, from] of Object.entries(licenses)) cpSync(join(nm, from), join(assets, "licenses", to));

const common = { bundle: true, format: "iife", target: "es2020", logLevel: "warning", legalComments: "none" };

await build({
  ...common,
  entryPoints: [join(plugin, "src/uploader.js")],
  outfile: join(assets, "uploader.js"),
});

await build({
  ...common,
  entryPoints: [join(plugin, "src/worker.js")],
  outfile: join(assets, "worker.js"),
  minify: true,
  // Emscripten glue reads import.meta.url; WASM is passed in pre-compiled, so the worker URL is enough.
  banner: { js: "var __squishedBase = self.location.href;" },
  define: { "import.meta.url": "__squishedBase" },
  // Node-only branches of the Emscripten glue.
  external: ["module", "fs", "path", "url", "worker_threads", "crypto"],
});

const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
rmSync(join(dist, "squished.zip"), { force: true });
execFileSync("zip", ["-rqX", join(dist, "squished.zip"), "squished", "-x", "*.DS_Store"], { cwd: root });
console.log("Built", join(dist, "squished.zip"));
