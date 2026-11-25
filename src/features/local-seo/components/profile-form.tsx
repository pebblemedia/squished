import { useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { geocode } from "../api/geocode";
import { emptyProfile, type BusinessProfile } from "../api/business-profile";

interface Props {
  profile: BusinessProfile;
  saved: BusinessProfile[];
  onChange: (p: BusinessProfile) => void;
  onDelete: (id: string) => void;
}

export function ProfileForm({ profile, saved, onChange, onDelete }: Props) {
  const [looking, setLooking] = useState(false);
  const [status, setStatus] = useState("");
  const set = (k: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...profile, [k]: e.target.value });
  const isSaved = saved.some((p) => p.id === profile.id);

  const lookup = async () => {
    const q = [profile.address, profile.city].filter((s) => s.trim()).join(", ");
    if (!q || looking) return;
    setLooking(true); setStatus("");
    try {
      const hit = await geocode(q);
      if (!hit) setStatus("No match — try adding the city and state.");
      else { onChange({ ...profile, latitude: hit.latitude, longitude: hit.longitude }); setStatus(`Found: ${hit.label}`); }
    } catch {
      setStatus("Couldn't reach the address lookup. Check your connection.");
    } finally { setLooking(false); }
  };

  return (
    <div className="space-y-3">
      {saved.length > 0 && (
        <div className="flex gap-2">
          <Select value={isSaved ? profile.id : "new"} onValueChange={(v) => onChange(v === "new" ? emptyProfile() : saved.find((p) => p.id === v) ?? profile)}>
            <SelectTrigger aria-label="Saved businesses" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New business…</SelectItem>
              {saved.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || "Untitled"}{p.city ? ` · ${p.city}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          {isSaved && (
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={() => onDelete(profile.id)} aria-label="Forget this business">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bp-name">Business name</Label>
          <Input id="bp-name" value={profile.name} onChange={set("name")} placeholder="Joe's Plumbing" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-city">City</Label>
          <Input id="bp-city" value={profile.city} onChange={set("city")} placeholder="Boise, ID" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bp-services">Services or keywords</Label>
        <Input id="bp-services" value={profile.services} onChange={set("services")} placeholder="drain cleaning, water heater repair" />
        <p className="text-[11px] text-muted-foreground">Comma-separated. Each photo gets one, in turn.</p>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="bp-address">Street address</Label>
          <Input id="bp-address" value={profile.address} onChange={set("address")} placeholder="123 Main St" />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => void lookup()} disabled={looking || !(profile.address + profile.city).trim()} aria-label="Find coordinates from this address" title="Find coordinates from this address">
          {looking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </div>
      {status && <p role="status" className="text-[11px] text-muted-foreground">{status}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-lat">Latitude</Label>
          <Input id="bp-lat" inputMode="decimal" value={profile.latitude} onChange={set("latitude")} placeholder="43.6150" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-lon">Longitude</Label>
          <Input id="bp-lon" inputMode="decimal" value={profile.longitude} onChange={set("longitude")} placeholder="-116.2023" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-author">Author</Label>
          <Input id="bp-author" value={profile.author ?? ""} onChange={set("author")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-copy">Copyright</Label>
          <Input id="bp-copy" value={profile.copyright ?? ""} onChange={set("copyright")} placeholder={profile.name ? `© ${profile.name}` : ""} />
        </div>
      </div>
    </div>
  );
}
