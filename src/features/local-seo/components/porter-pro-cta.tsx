import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

const KEY = "squished:porter-cta-dismissed";
const URL_ = "https://porterpromedia.com/?utm_source=squished&utm_medium=referral&utm_campaign=local-seo";

const dismissed = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

/** One quiet, dismissible line shown only after someone finishes local SEO edits. */
export function PorterProCta() {
  const [hidden, setHidden] = useState(dismissed);
  if (hidden) return null;
  const close = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  };
  return (
    <div className="relative rounded-lg border bg-muted/40 p-3 pr-9 text-xs">
      <p className="text-muted-foreground">
        Doing this for every location, every month?{" "}
        <a href={URL_} target="_blank" rel="noopener" className="font-medium text-foreground underline-offset-2 hover:underline">
          Porter Pro Media can run your Google Business Profile photos and local SEO<ArrowUpRight className="ml-0.5 inline size-3 align-[-2px]" />
        </a>
      </p>
      <button type="button" onClick={close} aria-label="Dismiss" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
