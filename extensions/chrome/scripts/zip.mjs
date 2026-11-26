import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

async function collect(dir, files = {}) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) await collect(full, files);
    else files[relative(dist, full).split("\\").join("/")] = new Uint8Array(await readFile(full));
  }
  return files;
}

const { version } = JSON.parse(await readFile(resolve(dist, "manifest.json"), "utf8"));
const out = resolve(root, `squished-chrome-${version}.zip`);
await writeFile(out, zipSync(await collect(dist), { level: 9 }));
console.log(`Wrote ${out}`);
