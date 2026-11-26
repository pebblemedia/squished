import { existsSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import { glob } from "tinyglobby";
import { formatBytes, listLimits, parseFormat, resolveFit } from "./options.js";
import { squishFile, type SquishOptions } from "./squish.js";

declare const __VERSION__: string;

const HELP = `squished: compress images on your machine. Nothing is uploaded.

Usage
  squished <files or globs...> [options]
  squished limits [query]      Upload limits for common destinations
  squished mcp                 Run a local MCP server (stdio)

Options
  --to <format>      jpeg | png | webp | avif (default: same as input)
  --quality <1-100>  Default 75
  --fit <size|dest>  Best quality at or under a size: 100kb, 2mb, or a destination like etsy
  --max-side <px>    Longest side in pixels
  --strip            Remove metadata (GPS, camera, dates) losslessly; keeps orientation
  --out <dir>        Output folder (default: next to each input)
  --suffix <text>    Added to output names (default: -squished)
  -h, --help         Show this help
  -v, --version      Show version
`;

async function expand(args: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const a of args) {
    if (existsSync(a) || !/[*?[{]/.test(a)) files.push(a);
    else files.push(...(await glob(a, { onlyFiles: true, expandDirectories: false })).sort());
  }
  return [...new Set(files)];
}

function printLimits(query?: string) {
  const rows = listLimits(query);
  if (!rows.length) return console.log(`No destinations match "${query}".`);
  for (const d of rows) {
    console.log(`${d.name}  (${d.slug})`);
    for (const r of d.rules) {
      const dims = r.maxWidth || r.maxHeight ? `, max ${r.maxWidth ?? "any"}×${r.maxHeight ?? "any"} px` : "";
      const size = r.maxBytes ? formatBytes(r.maxBytes).replace(".0 ", " ") : "no size limit";
      console.log(`  ${r.kind.padEnd(5)}  ${size}${dims}${r.label ? `  ${r.label}` : ""}`);
    }
    if (d.note) console.log(`  note: ${d.note}`);
  }
}

const num = (name: string, v: string | undefined) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number`);
  return n;
};

/** parseArgs rejects values starting with "-", but "--suffix -small" is the natural spelling. */
const joinSuffix = (args: string[]) =>
  args.flatMap((a, i) => (a === "--suffix" && i + 1 < args.length ? [] : args[i - 1] === "--suffix" ? [`--suffix=${a}`] : [a]));

function delta(saved: number) {
  const pct = Math.round(saved * 100);
  return pct > 0 ? `-${pct}%` : pct < 0 ? `+${-pct}%` : "0%";
}

async function main() {
  const { values, positionals } = parseArgs({
    args: joinSuffix(process.argv.slice(2)),
    allowPositionals: true,
    options: {
      to: { type: "string" },
      quality: { type: "string", short: "q" },
      fit: { type: "string" },
      "max-side": { type: "string" },
      strip: { type: "boolean" },
      out: { type: "string", short: "o" },
      suffix: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.version) return console.log(__VERSION__);
  if (values.help || !positionals.length) return console.log(HELP);
  if (positionals[0] === "limits") return printLimits(positionals.slice(1).join(" "));
  if (positionals[0] === "mcp") {
    const { runMcp } = await import("./mcp.js");
    return runMcp(__VERSION__);
  }

  const opts: SquishOptions = {
    to: parseFormat(values.to),
    quality: num("quality", values.quality),
    fit: values.fit,
    maxSide: num("max-side", values["max-side"]),
    strip: values.strip,
    outDir: values.out,
    suffix: values.suffix,
  };
  resolveFit(opts.fit); // fail once, early, on an unknown size or destination
  const files = await expand(positionals);
  if (!files.length) throw new Error("No files matched.");

  let failed = 0, before = 0, after = 0;
  for (const f of files) {
    try {
      const r = await squishFile(f, opts);
      before += r.before;
      after += r.after;
      console.log(`${basename(f)}  ${formatBytes(r.before)} → ${formatBytes(r.after)}  ${delta(r.saved)}${r.note ? `  (${r.note})` : ""}`);
    } catch (err) {
      failed++;
      console.error(`${basename(f)}  error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (files.length > 1 && before) {
    console.log(`Total  ${formatBytes(before)} → ${formatBytes(after)}  ${delta(1 - after / before)}`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`squished: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
