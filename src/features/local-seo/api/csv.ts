/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";

export const CSV_COLUMNS = ["filename", "new_name", "title", "description", "keywords", "address", "latitude", "longitude", "author", "copyright"] as const;
type Column = (typeof CSV_COLUMNS)[number];

const ALIASES: Record<string, Column> = {
  filename: "filename", file: "filename", file_name: "filename", original: "filename", photo: "filename",
  new_name: "new_name", newname: "new_name", rename: "new_name", seo_name: "new_name", name: "new_name",
  title: "title",
  description: "description", alt: "description", alt_text: "description", caption: "description",
  keywords: "keywords", tags: "keywords",
  address: "address", location: "address",
  latitude: "latitude", lat: "latitude",
  longitude: "longitude", lng: "longitude", lon: "longitude", long: "longitude",
  author: "author", artist: "author", creator: "author",
  copyright: "copyright",
};

export type CsvRow = Partial<Record<Column, string>>;

/** Rows keyed by known column names; throws if there's no filename column. */
export function readSeoCsv(text: string): CsvRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error("That CSV is empty.");
  const cols = header.map((h) => ALIASES[h.trim().toLowerCase().replace(/[\s-]+/g, "_")]);
  if (!cols.includes("filename")) throw new Error('Add a "filename" column with each photo\'s current file name.');
  return body.map((cells) => {
    const row: CsvRow = {};
    cols.forEach((c, i) => { if (c && cells[i]?.trim()) row[c] = cells[i].trim(); });
    return row;
  }).filter((r) => r.filename);
}

const base = (name: string) => name.trim().toLowerCase().replace(/\.[^.]+$/, "");

/** Index rows by file name; matches with or without the extension. */
export function matchRows<T extends { name: string }>(items: T[], rows: CsvRow[]) {
  const byName = new Map(rows.map((r) => [base(r.filename ?? ""), r]));
  const matched = items.flatMap((it) => {
    const row = byName.get(base(it.name));
    return row ? [{ item: it, row }] : [];
  });
  const used = new Set(matched.map((m) => base(m.row.filename ?? "")));
  const unmatched = rows.filter((r) => !used.has(base(r.filename ?? ""))).map((r) => r.filename ?? "");
  return { matched, unmatched };
}
