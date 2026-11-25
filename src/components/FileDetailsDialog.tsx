import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Cloud, Loader2, MapPin, Pencil, RefreshCw, Search } from "lucide-react";
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
import { useAccount } from "@/hooks/use-account";
import { getSavedSeo, listSavedSeo, saveSeoForClaude } from "@/lib/saved-seo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { geocode } from "@/features/local-seo/api/geocode";

export function FileDetailsDialog({ id }: { id: string }) {
  const item = useQueue((s) => s.items.find((x) => x.id === id));
  const update = useQueue((s) => s.updateOptions);
  const savePhotoDetails = useQueue((s) => s.savePhotoDetails);
  const { user } = useAccount();
  const route = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState<ImageMeta>({});
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<Awaited<ReturnType<typeof listSavedSeo>>>([]);
  const [cloudBusy, setCloudBusy] = useState(false);
  const cloudPending = useRef(false);
  const [cloudStatus, setCloudStatus] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setName(item.customName ?? item.name.replace(/\.[^.]+$/, ""));
    setMeta(item.meta ?? {});
  }, [open, item?.meta, item?.customName]);

  useEffect(() => {
    let active = true;
    setSavedRecords([]);
    setCloudStatus("");
    setCloudError("");
    setRecordsLoading(false);
    if (!open || !user || item?.kind !== "image") return;
    setRecordsLoading(true);
    listSavedSeo().then((rows) => { if (active) setSavedRecords(rows); }, (error) => {
      if (active) setCloudError(error instanceof Error ? error.message : "Couldn't load saved details.");
    }).finally(() => { if (active) setRecordsLoading(false); });
    return () => { active = false; };
  }, [open, user?.id, item?.kind]);

  if (!item) return null;
  const isImg = item.kind === "image";
  const baseName = item.name.replace(/\.[^.]+$/, "");
  const jpegOut = (item.outputName ?? "").toLowerCase().match(/\.jpe?g$/);

  const onOpen = (o: boolean) => {
    if (o) {
      setName(item.customName ?? baseName);
      setMeta(item.meta ?? {});
      setCloudStatus("");
      setCloudError("");
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
      const hit = await geocode(q);
      if (!hit) {
        setGeoStatus("No match found for that address — try adding a city or country.");
        return;
      }
      setMeta((m) => ({ ...m, latitude: hit.latitude, longitude: hit.longitude }));
      setGeoStatus(`Found: ${hit.label}`);
    } catch {
      setGeoStatus("Couldn't reach the address lookup. Check your connection and try again.");
    } finally {
      setGeocoding(false);
    }
  };

  const save = () => {
    if (isImg) savePhotoDetails(item.id, { customName: name, ...meta });
    else update(item.id, { customName: name.trim() && name.trim() !== baseName ? name.trim() : undefined });
    setOpen(false);
  };

  const saveForClaude = async () => {
    if (cloudPending.current) return;
    cloudPending.current = true; setCloudBusy(true); setCloudError(""); setCloudStatus("");
    try {
      savePhotoDetails(item.id, { customName: name, ...meta });
      const current = useQueue.getState().items.find((file) => file.id === item.id);
      if (!current) throw new Error("The photo is no longer in the queue.");
      const saved = await saveSeoForClaude(current);
      update(item.id, { savedSeoId: saved.id, savedSeoRevision: saved.revision, savedSeoOwner: saved.owner });
      setCloudStatus("SEO details saved privately for Claude. The original photo was not uploaded.");
      setSavedRecords(await listSavedSeo());
    } catch (error) { setCloudError(error instanceof Error ? error.message : "Couldn't save these details."); }
    finally { cloudPending.current = false; setCloudBusy(false); }
  };

  const loadSaved = async (recordId: string) => {
    if (!user || cloudPending.current) return;
    cloudPending.current = true; setCloudBusy(true); setCloudError(""); setCloudStatus("");
    try {
      const saved = await getSavedSeo(recordId);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.id !== user.id) throw new Error("Your account changed. Please load the details again.");
      // Loading a saved record replaces the current draft only on this explicit action.
      update(item.id, { customName: saved.custom_name ?? undefined, meta: saved.meta, savedSeoId: saved.id, savedSeoRevision: saved.revision, savedSeoOwner: user.id });
      setName(saved.custom_name ?? baseName); setMeta(saved.meta);
      setCloudStatus("Latest saved details loaded and applied to this photo.");
    } catch (error) { setCloudError(error instanceof Error ? error.message : "Couldn't load these details."); }
    finally { cloudPending.current = false; setCloudBusy(false); }
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
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Claude access</p>
                <p className="text-xs text-muted-foreground">Only SEO details you choose to save are stored in your account. Original photos stay on your device.</p>
                {user ? <>
                  {savedRecords.length > 0 && <Select value={item.savedSeoOwner === user.id ? item.savedSeoId : undefined} onValueChange={(value) => void loadSaved(value)} disabled={cloudBusy}>
                    <SelectTrigger aria-label="Saved SEO details"><SelectValue placeholder="Choose saved SEO details" /></SelectTrigger>
                    <SelectContent>{savedRecords.map((record) => <SelectItem key={record.id} value={record.id}>{record.custom_name ?? record.original_name} · {record.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                  </Select>}
                  {recordsLoading && <p role="status" className="text-xs text-muted-foreground">Loading saved details…</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void saveForClaude()} disabled={cloudBusy}>{cloudBusy ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}Save for Claude</Button>
                    {item.savedSeoId && item.savedSeoOwner === user.id && <Button variant="outline" size="sm" onClick={() => void loadSaved(item.savedSeoId ?? "")} disabled={cloudBusy}><RefreshCw className="size-4" />Load latest details</Button>}
                  </div>
                </> : <Button variant="outline" size="sm" asChild><Link to={`/login?next=${encodeURIComponent(route.pathname + route.search)}`} onClick={() => setOpen(false)}><Cloud className="size-4" />Sign in for Claude</Link></Button>}
                {cloudStatus && <p role="status" className="text-xs text-muted-foreground">{cloudStatus}</p>}
                {cloudError && <p role="alert" className="text-xs text-destructive">{cloudError}</p>}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={cloudBusy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
