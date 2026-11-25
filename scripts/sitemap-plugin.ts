import type { Plugin } from "vite";
import { TOOLS } from "../src/lib/tools";
import { DESTINATIONS, LIMITS_CHECKED } from "../src/lib/destinations";

const SITE_URL = "https://squished.app";

function buildSitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${SITE_URL}/tools`, priority: "0.8", changefreq: "weekly" },
    { loc: `${SITE_URL}/limits`, priority: "0.8", changefreq: "monthly" },
    ...TOOLS.map((t) => ({
      loc: `${SITE_URL}/${t.slug}`,
      priority: "0.7",
      changefreq: "weekly",
    })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function limitsJson(): string {
  return JSON.stringify(
    { checked: LIMITS_CHECKED, license: "CC BY 4.0", source: `${SITE_URL}/limits`, destinations: DESTINATIONS },
    null,
    2
  );
}

function limitsCsv(): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["platform", "group", "applies_to", "label", "max_bytes", "max_width", "max_height", "formats", "source", "note", "checked"]];
  for (const d of DESTINATIONS) {
    for (const r of d.rules) {
      rows.push([d.name, d.group, r.kind, r.label ?? "", String(r.maxBytes ?? ""), String(r.maxWidth ?? ""), String(r.maxHeight ?? ""), (r.formats ?? []).join(" "), d.source, d.note ?? "", LIMITS_CHECKED]);
    }
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

const STATIC_FILES: Record<string, { type: string; build: () => string }> = {
  "/sitemap.xml": { type: "application/xml", build: buildSitemap },
  "/limits.json": { type: "application/json", build: limitsJson },
  "/limits.csv": { type: "text/csv", build: limitsCsv },
};

export function sitemapPlugin(): Plugin {
  return {
    name: "squished-sitemap",
    apply: () => true,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url ? STATIC_FILES[req.url] : undefined;
        if (file) {
          res.setHeader("Content-Type", file.type);
          res.end(file.build());
          return;
        }
        next();
      });
    },
    generateBundle() {
      for (const [path, file] of Object.entries(STATIC_FILES)) {
        this.emitFile({ type: "asset", fileName: path.slice(1), source: file.build() });
      }
    },
  };
}
