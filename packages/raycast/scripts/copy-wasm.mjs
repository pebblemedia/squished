// Copies the CLI's codec .wasm files into assets/ so the bundled extension can load them.
import { cpSync, existsSync } from "node:fs";

const from = "../cli/dist/wasm";
if (!existsSync(from)) throw new Error("Build packages/cli first (npm run build there).");
cpSync(from, "assets/wasm", { recursive: true });
