// Local stdio MCP server. Tools read and write files on this machine only.
import { homedir } from "node:os";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FORMATS, listLimits } from "./options.js";
import { squishFile } from "./squish.js";

const expandHome = (p: string) => (p === "~" || p.startsWith("~/") ? homedir() + p.slice(1) : p);

const json = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  isError,
});

export function createServer(version: string): McpServer {
  const server = new McpServer({ name: "squished", version });

  server.registerTool(
    "compress_image",
    {
      title: "Compress images",
      description:
        "Compress JPEG, PNG, WebP or AVIF files on this computer and write the results next to them " +
        "(or into out_dir) with a -squished suffix. Originals are never overwritten. Files never leave the machine. " +
        "Use absolute paths.",
      inputSchema: {
        paths: z.array(z.string().min(1)).min(1).max(500).describe("Absolute paths of image files"),
        to: z.enum(FORMATS as [string, ...string[]]).optional().describe("Output format; default keeps the input format"),
        quality: z.number().int().min(1).max(100).optional().describe("1–100, default 75"),
        fit: z.string().max(64).optional().describe('Target size like "100kb" or "2mb", or a destination slug like "etsy" (see list_upload_limits)'),
        max_side: z.number().int().min(1).max(65535).optional().describe("Longest side in pixels"),
        strip: z.boolean().optional().describe("Remove metadata (GPS, camera, dates) losslessly; keeps orientation"),
        out_dir: z.string().min(1).optional().describe("Absolute output folder; default is next to each input"),
      },
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    async ({ paths, to, quality, fit, max_side, strip, out_dir }) => {
      const results = [];
      for (const p of paths) {
        try {
          const r = await squishFile(resolve(expandHome(p)), {
            to: to as (typeof FORMATS)[number] | undefined,
            quality,
            fit,
            maxSide: max_side,
            strip,
            outDir: out_dir ? resolve(expandHome(out_dir)) : undefined,
          });
          results.push({ ...r, saved_percent: Math.round(r.saved * 100) });
        } catch (err) {
          results.push({ input: p, error: err instanceof Error ? err.message : String(err) });
        }
      }
      return json({ results }, results.every((r) => "error" in r));
    },
  );

  server.registerTool(
    "list_upload_limits",
    {
      title: "List upload limits",
      description: "Upload size and dimension limits for common destinations (email, chat, social, marketplaces). Use a slug as compress_image's fit.",
      inputSchema: { query: z.string().max(64).optional().describe("Filter by name, slug or group, e.g. etsy or email") },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => json({ destinations: listLimits(query) }),
  );

  return server;
}

export async function runMcp(version: string) {
  await createServer(version).connect(new StdioServerTransport());
}
