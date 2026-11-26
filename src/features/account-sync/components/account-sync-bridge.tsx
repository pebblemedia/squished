import { useEffect } from "react";
import { useAccount } from "@/hooks/use-account";
import { getSyncPref, pushChange, syncAll } from "../api/cloud-sync";
import { onLocalChange } from "../api/local-change";
import { useSync } from "../api/sync-store";

/** Keeps recipes and saved businesses in step with the signed-in account when sync is on. Renders nothing. */
export function AccountSyncBridge() {
  const { user } = useAccount();
  const pref = useSync((s) => s.pref);
  const load = useSync((s) => s.load);
  const setStatus = useSync((s) => s.setStatus);
  const userId = user?.id;

  useEffect(() => { load(userId ? getSyncPref(userId) : null); }, [userId, load]);

  useEffect(() => {
    if (!userId || pref !== "on") return;
    let active = true;
    syncAll(userId).then(
      (r) => active && setStatus(`Synced ${r.recipes} recipe${r.recipes === 1 ? "" : "s"} and ${r.businesses} business${r.businesses === 1 ? "" : "es"}`),
      (e) => active && setStatus(e instanceof Error ? e.message : "Couldn't sync."),
    );
    const off = onLocalChange((c) => {
      void pushChange(userId, c).then(
        () => setStatus("Synced to your account"),
        () => setStatus("Couldn't sync the last change. It's still saved on this device."),
      );
    });
    return () => { active = false; off(); };
  }, [userId, pref, setStatus]);

  return null;
}
