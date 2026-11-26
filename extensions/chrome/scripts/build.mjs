import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildManifest, DEV_ORIGIN, PROD_ORIGIN } from "../src/manifest.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
const test = process.argv.includes("--test");
const outdir = resolve(root, dev ? "dist-dev" : test ? "dist-test" : "dist");
const iconSource = resolve(root, "../../src/assets/squished-icon.svg");
const ICON_SIZES = [16, 32, 48, 128];

const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const origins = dev ? [PROD_ORIGIN, DEV_ORIGIN] : [PROD_ORIGIN];

await rm(outdir, { recursive: true, force: true });
await mkdir(resolve(outdir, "icons"), { recursive: true });

const shared = {
  bundle: true,
  target: "chrome116",
  minify: !dev,
  legalComments: "none",
  define: {
    __SQUISHED_ORIGINS__: JSON.stringify(origins),
    __SQUISHED_TEST__: JSON.stringify(test),
  },
};

await Promise.all([
  build({ ...shared, entryPoints: [resolve(root, "src/background/service-worker.js")], outfile: resolve(outdir, "service-worker.js"), format: "esm" }),
  build({ ...shared, entryPoints: [resolve(root, "src/content/content-script.js")], outfile: resolve(outdir, "content-script.js"), format: "iife" }),
]);

const svg = await readFile(iconSource);
await Promise.all(
  ICON_SIZES.map((size) =>
    sharp(svg, { density: 1200 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(resolve(outdir, `icons/icon-${size}.png`)),
  ),
);

await writeFile(resolve(outdir, "manifest.json"), JSON.stringify(buildManifest({ version, dev }), null, 2));
console.log(`Built ${outdir}`);
