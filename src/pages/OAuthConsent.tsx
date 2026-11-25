import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { oauthClient, type AuthorizationDetails } from "@/lib/oauth-client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const id = params.get("authorization_id") ?? "";
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setDetails(null); setError("");
    if (!id) { setError("This connection request is missing its authorization ID."); return; }
    if (loading) return;
    if (!user) {
      const next = window.location.pathname + window.location.search + window.location.hash;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    (async () => {
      try {
        const { data, error } = await oauthClient.getAuthorizationDetails(id);
        if (!active) return;
        if (error) throw new Error("Couldn't load this connection request. It may have expired, or the connection service may be unavailable. Start a new connection in Claude.");
        if (!data) throw new Error("Couldn't load this connection request. Try starting it again.");
        const redirect = data.redirect_url ?? data.redirect_to;
        if (redirect && !data.client) { window.location.assign(redirect); return; }
        setDetails(data);
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Couldn't load the connection request."); }
    })();
    return () => { active = false; };
  }, [id, user, loading, navigate]);

  async function decide(approve: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error } = approve ? await oauthClient.approveAuthorization(id) : await oauthClient.denyAuthorization(id);
      if (error) throw new Error(approve ? "Couldn't approve the connection. Please try again." : "Couldn't cancel the connection. Please try again.");
      const redirect = data?.redirect_url ?? data?.redirect_to;
      if (!redirect) throw new Error("No return address was provided. Please start the connection again.");
      window.location.assign(redirect);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn't complete the connection."); setBusy(false); }
  }
  const clientName = details?.client?.name ?? "the requesting app";
  const scopes = details?.scope?.split(/\s+/).filter(Boolean) ?? [];
  const scopeLabels: Record<string, string> = { openid: "Share your basic profile", profile: "Share your basic profile", email: "Share your email address" };
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-lg px-5 py-12">
    <h1 className="text-2xl font-semibold break-words">{details ? `Connect ${clientName} to Squished` : error ? "Connection unavailable" : "Loading connection…"}</h1>
    {!details && !error && <Loader2 className="mt-6 size-5 animate-spin text-muted-foreground" />}
    {details && <>
      <p className="mt-3 text-sm text-muted-foreground break-words">Signed in as {user?.email}</p>
      {details.redirect_uri && <p className="mt-2 break-all text-xs text-muted-foreground">Return address: {details.redirect_uri}</p>}
      <p className="mt-6 text-sm">This lets {clientName} use Squished as you.</p>
      <ul className="mt-4 space-y-3 text-sm">
        <li className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-primary" />Read and edit your explicitly saved photo SEO details, including location and coordinates.</li>
        {[...new Set(scopes.map((scope) => scopeLabels[scope] ?? `Additional permission requested: ${scope}`))].map((label) => <li key={label} className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-primary" />{label}</li>)}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">Original photos stay on your device. Only details you save for Claude are accessible. This connection does not bypass your account's permissions.</p>
    </>}
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    {details && <div className="mt-7 flex flex-wrap gap-3">
      <Button disabled={busy} onClick={() => void decide(true)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}Approve connection</Button>
      <Button variant="outline" disabled={busy} onClick={() => void decide(false)}><X className="size-4" />Cancel connection</Button>
    </div>}
    {user && <Button variant="link" className="mt-5 h-auto px-0" disabled={busy} onClick={() => void supabase.auth.signOut().then(({ error }) => { if (error) setError("Couldn't sign out. Please try again."); }, () => setError("Couldn't sign out. Please try again."))}>Use a different account</Button>}
    {!details && error && <Button variant="outline" asChild className="mt-5"><Link to="/">Back to Squished</Link></Button>}
  </main></div>;
}