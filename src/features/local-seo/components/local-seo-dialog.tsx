import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useQueue } from "@/store/queue";
import type { SeoPatch } from "@/lib/seo-fields";
import { deleteProfile, emptyProfile, loadProfiles, saveProfile, type BusinessProfile } from "../api/business-profile";
import { buildPhotoSeo, DEFAULT_PATTERN, PATTERN_TOKENS } from "../api/seo-template";
import { applySeo, writesJpeg } from "../api/apply";
import { MODEL_DOWNLOAD_MB } from "../api/caption";
import { useAutopilot } from "../hooks/use-autopilot";
import { ProfileForm } from "./profile-form";
import { CsvImport } from "./csv-import";
import { PorterProCta } from "./porter-pro-cta";

type Patches = { id: string; fields: SeoPatch }[];

/** Names, describes and geotags every photo in the queue at once, for one business or from a CSV. */
export function LocalSeoDialog() {
  const items = useQueue((s) => s.items);
  const images = useMemo(() => items.filter((i) => i.kind === "image"), [items]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("one");
  const [saved, setSaved] = useState<BusinessProfile[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [remember, setRemember] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [toJpeg, setToJpeg] = useState(true);
  const [csvPatches, setCsvPatches] = useState<Patches | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ai = useAutopilot();

  if (!images.length) return null;

  const onOpen = (o: boolean) => {
    if (busy) return;
    if (o) {
      const list = loadProfiles();
      setSaved(list);
      setProfile(list[0] ?? emptyProfile());
      setDone(null); setError(""); setCsvPatches(null);
    }
    setOpen(o);
  };

  const needsJpeg = images.some((i) => !writesJpeg(i));
  const preview = buildPhotoSeo(profile, { index: 0, total: images.length, originalName: images[0].name, pattern });
  const canApply = tab === "one"
    ? !!(profile.name.trim() || profile.city.trim() || profile.services.trim())
    : !!csvPatches?.length;

  const apply = async () => {
    setError(""); setBusy(true);
    try {
      let patches: Patches;
      if (tab === "one") {
        if (remember) setSaved(saveProfile(profile));
        const captions = useAi ? await ai.run(images) : new Map<string, string>();
        if (useAi && !captions.size) setError("The on-device model couldn't describe these photos, so they got template text instead.");
        patches = images.map((it, index) => ({
          id: it.id,
          fields: buildPhotoSeo(profile, { index, total: images.length, originalName: it.name, pattern, caption: captions.get(it.id) }),
        }));
      } else patches = csvPatches ?? [];
      setDone(applySeo(patches, toJpeg && needsJpeg));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><MapPin className="size-4" /> Local SEO</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Local SEO for {images.length} photo{images.length > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>Name, describe and geotag every photo at once. Everything happens on this device.</DialogDescription>
        </DialogHeader>

        {done !== null ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{done} photo{done === 1 ? "" : "s"} updated. Download as usual; the details are written into each JPEG.</p>
            </div>
            {error && <p role="status" className="text-xs text-muted-foreground">{error}</p>}
            <PorterProCta />
            <DialogFooter><Button onClick={() => setOpen(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="one">One business</TabsTrigger>
                <TabsTrigger value="csv">From a spreadsheet</TabsTrigger>
              </TabsList>
              <TabsContent value="one" className="space-y-4 pt-2">
                <ProfileForm profile={profile} saved={saved} onChange={setProfile} onDelete={(id) => { setSaved(deleteProfile(id)); setProfile(emptyProfile()); }} />
                <div className="space-y-1.5">
                  <Label htmlFor="ls-pattern">File names</Label>
                  <Input id="ls-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    Use {PATTERN_TOKENS.join(" ")}. First photo: <span className="font-medium text-foreground">{preview.customName || "—"}</span>
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="ls-ai" className="flex items-center gap-1.5"><Sparkles className="size-3.5" />Describe each photo with on-device AI</Label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Writes real alt text and adds {"{subject}"} words. One-time ~{MODEL_DOWNLOAD_MB} MB download, then it works offline. Photos never leave your device.
                    </p>
                  </div>
                  <Switch id="ls-ai" checked={useAi} onCheckedChange={setUseAi} />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                  Remember this business on this device
                </label>
              </TabsContent>
              <TabsContent value="csv" className="pt-2">
                <CsvImport images={images} onReady={setCsvPatches} />
              </TabsContent>
            </Tabs>

            {needsJpeg && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={toJpeg} onCheckedChange={(v) => setToJpeg(v === true)} />
                Save photos as JPEG so the details are written into them
              </label>
            )}
            {ai.status && <p role="status" className="text-xs text-muted-foreground">{ai.status}</p>}
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => void apply()} disabled={!canApply || busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Apply to {tab === "csv" && csvPatches ? csvPatches.length : images.length} photo{(tab === "csv" && csvPatches ? csvPatches.length : images.length) === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
