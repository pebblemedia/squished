import { emitLocalChange } from "@/features/account-sync/api/local-change";

/** A business (or client location) whose details get written into photos. Stored only in this browser. */
export interface BusinessProfile {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  /** Comma-separated services or keywords, rotated across photos. */
  services: string;
  author?: string;
  copyright?: string;
}

const KEY = "squished:business-profiles";

export const emptyProfile = (): BusinessProfile => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  name: "", city: "", address: "", latitude: "", longitude: "", services: "",
});

export function loadProfiles(): BusinessProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((p) => p && typeof p.id === "string") : [];
  } catch {
    return [];
  }
}

/** Replace the local list (used when pulling from the account); doesn't notify sync. */
export function writeProfiles(list: BusinessProfile[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage blocked: the profile still applies to this session */
  }
}

export function saveProfile(profile: BusinessProfile): BusinessProfile[] {
  const next = [profile, ...loadProfiles().filter((p) => p.id !== profile.id)].slice(0, 50);
  writeProfiles(next);
  const { id, ...data } = profile;
  emitLocalChange({ collection: "businesses", op: "save", id, name: profile.name.slice(0, 120), data });
  return next;
}

export function deleteProfile(id: string): BusinessProfile[] {
  const next = loadProfiles().filter((p) => p.id !== id);
  writeProfiles(next);
  emitLocalChange({ collection: "businesses", op: "delete", id });
  return next;
}

export const servicesOf = (p: Pick<BusinessProfile, "services">) =>
  p.services.split(",").map((s) => s.trim()).filter(Boolean);
