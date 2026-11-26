// Bundles the CLI and API into dist/ and copies the jSquash .wasm files beside them.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
await rm("dist", { recursive: true, force: true });

// Some bundled deps are CommonJS and call require() for Node built-ins.
const requireShim = 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);';
const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  logLevel: "warning",
  define: { __VERSION__: JSON.stringify(pkg.version) },
};
await build({ ...common, entryPoints: ["src/cli.ts"], outfile: "dist/cli.js", banner: { js: `#!/usr/bin/env node\n${requireShim}` } });
// No shim here: the API gets re-bundled by other tools (e.g. Raycast, to CommonJS).
await build({ ...common, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });

const { WASM_FILES } = await import(pathToFileURL(resolve("dist/index.js")).href);
await mkdir("dist/wasm", { recursive: true });
for (const [name, from] of Object.entries(WASM_FILES)) {
  await copyFile(join("node_modules", from), join("dist/wasm", name));
}
