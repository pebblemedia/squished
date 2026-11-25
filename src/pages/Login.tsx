import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";
import { oauthReturnPath, storeAuthReturn } from "@/lib/oauth-return-path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { Seo, canonicalFor } from "@/components/seo/Seo";

export default function Login() {
  const [params] = useSearchParams();
  const next = oauthReturnPath(params.get("next"));
  const navigate = useNavigate();
  const { user, loading } = useAccount();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (!loading && user) navigate(next, { replace: true }); }, [user, loading, next, navigate]);

  const callback = () => new URL(`/auth/callback?next=${encodeURIComponent(next)}`, window.location.origin).href;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback() } });
        if (error) throw error;
        if (data.session) navigate(next, { replace: true });
        else setNotice("Check your email to confirm your account, then return to continue.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next, { replace: true });
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn't sign in. Please try again."); }
    finally { setBusy(false); }
  }
  async function social(provider: "google" | "lovable") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      storeAuthReturn(next);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: callback() });
      if (result.error) throw result.error;
      if (!result.redirected) navigate(next, { replace: true });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn't sign in. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen">
    <Seo title="Sign in — Squished" description="Sign in to manage your private saved photo SEO details and agent connections." canonical={canonicalFor("/login")} />
    <SiteHeader />
    <main className="mx-auto max-w-sm px-5 py-12">
      <h1 className="text-2xl font-semibold">{signup ? "Create your account" : "Sign in to Squished"}</h1>
      <div className="mt-6 space-y-3">
        <Button variant="google" className="w-full [&_svg]:size-[18px]" disabled={busy} onClick={() => void social("google")}>
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full [&_svg]:size-[18px]" disabled={busy} onClick={() => void social("lovable")}><LovableMark />Continue with Lovable</Button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Button className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{signup ? "Create account" : "Sign in"}</Button>
      </form>
      <Button variant="link" className="mt-3 h-auto w-full whitespace-normal" onClick={() => { setSignup(!signup); setError(""); setNotice(""); }}>{signup ? "Already have an account? Sign in" : "New to Squished? Create an account"}</Button>
      <Link className="mt-5 block text-center text-sm text-muted-foreground" to="/">Back to files</Link>
    </main>
  </div>;
}