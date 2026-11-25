import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAccount } from "@/hooks/use-account";
import { consumeAuthReturn, oauthReturnPath } from "@/lib/oauth-return-path";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const { user, loading } = useAccount();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    if (loading) return;
    const next = params.has("next") ? oauthReturnPath(params.get("next")) : consumeAuthReturn();
    if (user) { navigate(next, { replace: true }); return; }
    setError("Sign-in wasn't completed. Please try again.");
  }, [loading, user, navigate, params]);
  return <main className="mx-auto max-w-md px-5 py-16">
    <h1 className="text-2xl font-semibold">{error ? "Couldn't complete sign-in" : "Signing you in…"}</h1>
    {error && <><p role="alert" className="mt-3 text-sm text-destructive">{error}</p><Button asChild className="mt-5"><Link to={`/login?next=${encodeURIComponent(oauthReturnPath(params.get("next")))}`}>Try again</Link></Button></>}
  </main>;
}