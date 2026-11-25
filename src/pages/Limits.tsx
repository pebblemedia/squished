import { Link } from "react-router-dom";
import { ArrowRight, Download, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, canonicalFor, SITE_URL } from "@/components/seo/Seo";
import { DESTINATIONS, GROUP_LABELS, LIMITS_CHECKED, type DestinationGroup, type DestinationRule } from "@/lib/destinations";
import { sizeLabel } from "@/lib/fit";
import { TOOLS_BY_SLUG } from "@/lib/tools";

const KIND_LABEL: Record<DestinationRule["kind"], string> = {
  image: "Images", video: "Video", audio: "Audio", pdf: "PDF", any: "Any file",
};

function describe(r: DestinationRule): string {
  const parts = [r.maxBytes ? sizeLabel(r.maxBytes) : null];
  if (r.maxWidth || r.maxHeight) parts.push(`max ${r.maxWidth ?? "?"}×${r.maxHeight ?? "?"} px`);
  if (r.minWidth || r.minHeight) parts.push(`min ${r.minWidth ?? "?"}×${r.minHeight ?? "?"} px`);
  return parts.filter(Boolean).join(" · ");
}

const Limits = () => {
  const groups = (Object.keys(GROUP_LABELS) as DestinationGroup[]).map((g) => ({
    g, list: DESTINATIONS.filter((d) => d.group === g),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "File upload size limits by platform",
    description: `Upload size and dimension limits for ${DESTINATIONS.length} email, chat, social, marketplace and form platforms, each linked to the platform's own help page.`,
    url: `${SITE_URL}/limits`,
    dateModified: LIMITS_CHECKED,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "Squished", url: SITE_URL },
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/limits.json` },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}/limits.csv` },
    ],
  };

  return (
    <div className="relative min-h-screen">
      <Seo
        title={`File Upload Size Limits for ${DESTINATIONS.length} Platforms (Gmail, Discord, Etsy…) | Squished`}
        description="Current upload limits for Gmail, Outlook, Discord, WhatsApp, X, LinkedIn, Etsy, Shopify, Google Business Profile and more — each with its official source."
        canonical={canonicalFor("/limits")}
        jsonLd={jsonLd}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-hero" />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-12">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            File upload limits
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            How big a file can be on {DESTINATIONS.length} popular platforms. Every number links to the
            platform's own help page. Last checked {LIMITS_CHECKED}.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <a href="/limits.json" download className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 hover:border-primary">
              <Download className="size-3.5" /> JSON
            </a>
            <a href="/limits.csv" download className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 hover:border-primary">
              <Download className="size-3.5" /> CSV
            </a>
            <span className="text-muted-foreground">Free to reuse under CC BY 4.0 with a link back.</span>
          </div>
        </section>

        <div className="mt-12 space-y-12">
          {groups.map(({ g, list }) => (
            <section key={g}>
              <h2 className="font-display text-xl font-semibold">{GROUP_LABELS[g]}</h2>
              <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-card">
                {list.map((d) => {
                  const fitTool = TOOLS_BY_SLUG[`compress-for-${d.slug}`];
                  return (
                    <div key={d.slug} className="grid gap-2 p-4 sm:grid-cols-[200px_1fr_auto] sm:items-start">
                      <div className="font-medium">{d.name}</div>
                      <div className="min-w-0 text-sm">
                        <ul className="space-y-0.5">
                          {d.rules.map((r, i) => (
                            <li key={i}>
                              <span className="font-medium tabular-nums">{describe(r)}</span>
                              <span className="text-muted-foreground"> — {r.label ?? KIND_LABEL[r.kind]}</span>
                            </li>
                          ))}
                        </ul>
                        {d.note && <p className="mt-1 text-xs text-muted-foreground">{d.note}</p>}
                        <a href={d.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                          Source <ExternalLink className="size-3" />
                        </a>
                      </div>
                      {fitTool && (
                        <Link to={`/${fitTool.slug}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium hover:text-primary">
                          Make it fit <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Sizes use 1 MB = 1,024 KB; platforms rarely say which they mean, so leave a little headroom.
          Spotted a change? Limits move — the platform's own page always wins.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Limits;
