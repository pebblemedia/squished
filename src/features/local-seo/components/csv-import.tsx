import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "@/lib/files";
import type { SeoPatch } from "@/lib/seo-fields";
import { CSV_COLUMNS, matchRows, readSeoCsv, toCsv, type CsvRow } from "../api/csv";
import { geocode } from "../api/geocode";

interface Props {
  images: QueueItem[];
  onReady: (patches: { id: string; fields: SeoPatch }[] | null) => void;
}

const rowFields = (r: CsvRow): SeoPatch => Object.fromEntries(Object.entries({
  customName: r.new_name, title: r.title, description: r.description, keywords: r.keywords,
  location: r.address, latitude: r.latitude, longitude: r.longitude, author: r.author, copyright: r.copyright,
}).filter(([, v]) => v !== undefined)) as SeoPatch;

export function CsvImport({ images, onReady }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const downloadTemplate = () => {
    const rows = [[...CSV_COLUMNS], ...images.map((i) => [i.name, ...CSV_COLUMNS.slice(1).map(() => "")])];
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "squished-photo-seo.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const load = async (file: File) => {
    setError(""); setSummary(""); onReady(null);
    try {
      const { matched, unmatched } = matchRows(images, readSeoCsv(await file.text()));
      if (!matched.length) throw new Error("No rows matched a photo in the queue. The filename column must match the original file names.");
      const needGeo = matched.filter((m) => m.row.address && !(m.row.latitude && m.row.longitude));
      let missed = 0;
      for (let i = 0; i < needGeo.length; i++) {
        setBusy(`Looking up addresses… ${i + 1} of ${needGeo.length}`);
        const hit = await geocode(needGeo[i].row.address ?? "").catch(() => null);
        if (hit) Object.assign(needGeo[i].row, { latitude: hit.latitude, longitude: hit.longitude });
        else missed++;
      }
      onReady(matched.map((m) => ({ id: m.item.id, fields: rowFields(m.row) })));
      setSummary([
        `${matched.length} of ${images.length} photos matched.`,
        unmatched.length ? `${unmatched.length} row${unmatched.length > 1 ? "s" : ""} didn't match: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "…" : ""}.` : "",
        missed ? `${missed} address${missed > 1 ? "es" : ""} couldn't be found, so those photos won't be geotagged.` : "",
      ].filter(Boolean).join(" "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that CSV.");
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        One row per photo. Match by <span className="font-medium text-foreground">filename</span>; add any of new_name, title, description, keywords, address, latitude, longitude, author, copyright. Addresses without coordinates are looked up for you.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}><Download className="size-4" />Template with these {images.length} photos</Button>
        <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={!!busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}Choose CSV
        </Button>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void load(f); }} />
      </div>
      {busy && <p role="status" className="text-xs text-muted-foreground">{busy}</p>}
      {summary && <p role="status" className="text-xs">{summary}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
