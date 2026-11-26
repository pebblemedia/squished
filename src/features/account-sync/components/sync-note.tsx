import { Link, useLocation } from "react-router-dom";
import { Cloud } from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import { useSync } from "../api/sync-store";

/** One quiet line under the recipe picker: sign in to sync, a one-time opt-in, or the sync status. */
export function SyncNote() {
  const { user, loading } = useAccount();
  const pref = useSync((s) => s.pref);
  const status = useSync((s) => s.status);
  const choose = useSync((s) => s.choose);
  const { pathname } = useLocation();
  if (loading) return null;

  const line = "mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[11px] text-muted-foreground";
  const link = "font-medium text-foreground underline-offset-2 hover:underline";

  if (!user) {
    return (
      <p className={line}>
        <Cloud className="size-3" />
        <Link to={`/login?next=${encodeURIComponent(pathname)}`} className={link}>Sign in</Link> to sync recipes and businesses across devices. Files are never uploaded.
      </p>
    );
  }
  if (pref === null) {
    return (
      <p className={line}>
        <Cloud className="size-3" />Sync your recipes and saved businesses to your account?
        <button type="button" className={link} onClick={() => choose(user.id, "on")}>Turn on</button>·
        <button type="button" className="hover:text-foreground" onClick={() => choose(user.id, "off")}>Not now</button>
      </p>
    );
  }
  if (pref === "on") {
    return (
      <p className={line} role="status">
        <Cloud className="size-3" />{status || "Syncing…"} ·
        <button type="button" className="hover:text-foreground" onClick={() => choose(user.id, "off")}>Turn off</button>
      </p>
    );
  }
  return (
    <p className={line}>
      <button type="button" className="hover:text-foreground" onClick={() => choose(user.id, "on")}>Sync recipes to your account</button>
    </p>
  );
}
