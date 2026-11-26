import { create } from "zustand";
import { setSyncPref, type SyncPref } from "./cloud-sync";

interface SyncState {
  pref: SyncPref;
  status: string;
  setStatus: (s: string) => void;
  load: (pref: SyncPref) => void;
  choose: (userId: string, pref: "on" | "off") => void;
}

export const useSync = create<SyncState>((set) => ({
  pref: null,
  status: "",
  setStatus: (status) => set({ status }),
  load: (pref) => set({ pref, status: "" }),
  choose: (userId, pref) => { setSyncPref(userId, pref); set({ pref, status: pref === "on" ? "Syncing…" : "" }); },
}));
