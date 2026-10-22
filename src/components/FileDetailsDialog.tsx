import { useState } from "react";
import { Loader2, MapPin, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useQueue } from "@/store/queue";
import type { ImageMeta } from "@/lib/metadata";
import { hasMeta } from "@/lib/metadata";

export function FileDetailsDialog({ id }: { id: string }) {
  const item = useQueue((s) => s.items.find((x) => x.id === id));
  const update = useQueue((s) => s.updateOptions);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState<ImageMeta>({});
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  if (!item) return null;
  const isImg = item.kind === "image";
  const baseName = item.name.replace(/\.[^.]+$/, "");
  const jpegOut = (item.outputName ?? "").toLowerCase().match(/\.jpe?g$/);

  const onOpen = (o: boolean) => {
    if (o) {
      setName(item.customName ?? baseName);
      setMeta(item.meta ?? {});
    }
    setOpen(o);
  };

  const set = (k: keyof ImageMeta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMeta((m) => ({ ...m, [k]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMeta((m) => ({
          ...m,
          latitude: p.coords.latitude.toFixed(6),
          longitude: p.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const geocodeLocation = async () => {
    const q = (meta.location ?? "").trim();
    if (!q || geocoding) return;
    setGeocoding(true);
    setGeoStatus(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!rows.length) {
        setGeoStatus("No match found for that address — try adding a city or country.");
        return;
      }
      setMeta((m) => ({
        ...m,
        latitude: parseFloat(rows[0].lat).toFixed(6),
        longitude: parseFloat(rows[0].lon).toFixed(6),
      }));
      setGeoStatus(`Found: ${rows[0].display_name}`);
    } catch {
      setGeoStatus("Couldn't reach the address lookup. Check your connection and try again.");
    } finally {
      setGeocoding(false);
    }
  };

  const save = () => {
    update(item.id, {
      customName: name.trim() && name.trim() !== baseName ? name.trim() : undefined,
      meta: isImg ? meta : undefined,
    });
    setOpen(false);
  };

  const edited = !!item.customName || hasMeta(item.meta);

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Pencil className="size-3.5" /> {edited ? "Edited" : isImg ? "Name & SEO" : "Rename"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isImg ? "File name & SEO details" : "Rename file"}</DialogTitle>
          <DialogDescription>
            {isImg
              ? "Use a descriptive, keyword-rich file name. Details are written into the photo when you download."
              : "Choose the name used when you download."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fname">File name</Label>
            <Input id="fname" value={name} onChange={(e) => setName(e.target.value)} placeholder="boise-river-sunset" />
            <p className="text-[11px] text-muted-foreground">Tip: lowercase words separated by dashes rank best.</p>
          </div>

          {isImg && (
            <>
              {!jpegOut && (
                <p className="rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
                  Photo details are saved into JPEG files only. Set the format to JPEG to include them.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="mtitle">Title</Label>
                <Input id="mtitle" value={meta.title ?? ""} onChange={set("title")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mdesc">Description / alt text</Label>
                <Textarea id="mdesc" rows={2} value={meta.description ?? ""} onChange={set("description")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkw">Keywords</Label>
                <Input id="mkw" value={meta.keywords ?? ""} onChange={set("keywords")} placeholder="boise, river, sunset" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mauth">Author</Label>
                  <Input id="mauth" value={meta.author ?? ""} onChange={set("author")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mcopy">Copyright</Label>
                  <Input id="mcopy" value={meta.copyright ?? ""} onChange={set("copyright")} />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mloc">Location name or address</Label>
                  <Input id="mloc" value={meta.location ?? ""} onChange={set("location")} placeholder="Boise, Idaho" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={geocodeLocation}
                  disabled={geocoding || !(meta.location ?? "").trim()}
                  aria-label="Find coordinates from this address"
                  title="Find coordinates from this address"
                >
                  {geocoding ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </div>
              {geoStatus && (
                <p className="text-[11px] text-muted-foreground" role="status">{geoStatus}</p>
              )}
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mlat">Latitude</Label>
                  <Input id="mlat" inputMode="decimal" value={meta.latitude ?? ""} onChange={set("latitude")} placeholder="43.6150" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mlon">Longitude</Label>
                  <Input id="mlon" inputMode="decimal" value={meta.longitude ?? ""} onChange={set("longitude")} placeholder="-116.2023" />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={useMyLocation} disabled={locating} aria-label="Use my location">
                  <MapPin className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
