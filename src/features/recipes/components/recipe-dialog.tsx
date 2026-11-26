import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FitPicker } from "@/components/FitPicker";
import type { FitChoice } from "@/lib/fit";
import { deleteProfile, emptyProfile, loadProfiles, saveProfile, type BusinessProfile } from "@/features/local-seo/api/business-profile";
import { DEFAULT_PATTERN, PATTERN_TOKENS } from "@/features/local-seo/api/seo-template";
import { ProfileForm } from "@/features/local-seo/components/profile-form";
import { profileForRecipe, recipeBusiness, type Recipe, type RecipeData } from "../api/recipe";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Recipe to edit or copy; null starts blank. */
  initial: Recipe | null;
  onSave: (data: RecipeData, id?: string) => void;
}

const ALL_KINDS = ["image", "video", "audio", "pdf"] as const;
type ImageFormat = NonNullable<RecipeData["imageFormat"]>;

export function RecipeDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<ImageFormat>("original");
  const [fit, setFit] = useState<FitChoice>({ type: "none" });
  const [maxSide, setMaxSide] = useState("");
  const [seoOn, setSeoOn] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [saved, setSaved] = useState<BusinessProfile[]>([]);
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);

  useEffect(() => {
    if (!open) return;
    const list = loadProfiles();
    setSaved(list);
    setName(initial && !initial.builtIn ? initial.name : initial ? `${initial.name} (my copy)` : "");
    setFormat(initial?.imageFormat ?? "original");
    setFit((initial?.fit as FitChoice) ?? { type: "none" });
    setMaxSide(initial?.maxSide ? String(initial.maxSide) : "");
    setSeoOn(!!initial?.seo);
    setProfile(initial?.seo ? { ...recipeBusiness(initial.seo.profile), id: emptyProfile().id } : list[0] ?? emptyProfile());
    setPattern(initial?.seo?.pattern || DEFAULT_PATTERN);
  }, [open, initial]);

  const side = parseInt(maxSide, 10);
  const save = () => {
    if (seoOn) saveProfile(profile);
    onSave({
      v: 1,
      name: name.trim() || "My recipe",
      ...(format !== "original" ? { imageFormat: format } : {}),
      ...(fit.type !== "none" ? { fit } : {}),
      ...(side >= 64 ? { maxSide: Math.min(side, 16384) } : {}),
      ...(initial?.imagesOnly ? { imagesOnly: true } : {}),
      ...(seoOn ? { seo: { profile: profileForRecipe(profile), pattern: pattern.trim() || DEFAULT_PATTERN } } : {}),
    }, initial && !initial.builtIn ? initial.id : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial && !initial.builtIn ? "Edit recipe" : "New recipe"}</DialogTitle>
          <DialogDescription>Settings every file you drop gets. Share it as a link; no account needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rc-name">Name</Label>
            <Input id="rc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Joe's Plumbing — GBP photos" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Image format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Keep format</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="avif">AVIF</SelectItem>
                  <SelectItem value="strip">Remove metadata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fit for</Label>
              <FitPicker value={fit} kinds={[...ALL_KINDS]} onChange={setFit} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-side">Longest side (px, images)</Label>
            <Input id="rc-side" inputMode="numeric" value={maxSide} onChange={(e) => setMaxSide(e.target.value.replace(/\D/g, ""))} placeholder="No limit" />
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="rc-seo">Name and geotag photos for a business</Label>
              <Switch id="rc-seo" checked={seoOn} onCheckedChange={setSeoOn} />
            </div>
            {seoOn && (
              <>
                <ProfileForm profile={profile} saved={saved} onChange={setProfile} onDelete={(id) => { setSaved(deleteProfile(id)); setProfile(emptyProfile()); }} />
                <div className="space-y-1.5">
                  <Label htmlFor="rc-pattern">File names</Label>
                  <Input id="rc-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Use {PATTERN_TOKENS.filter((t) => t !== "{subject}").join(" ")}.</p>
                </div>
                {format !== "jpeg" && (
                  <p className="rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
                    Photo details are written into JPEG files only. Set the format to JPEG to include them.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">The business details travel inside the share link.</p>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save recipe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
