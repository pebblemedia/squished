import { finalizeOutput } from "@/lib/metadata";
import JSZip from "jszip";
import { Link } from "react-router-dom";
import { Download, Trash2, ArrowRight } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { FileRow } from "@/components/FileRow";
import { BulkControls } from "@/components/BulkControls";
import { ShareReceipt } from "@/components/ShareReceipt";
import { LocalSeoDialog } from "@/features/local-seo/components/local-seo-dialog";
import { RecipeBar } from "@/features/recipes/components/recipe-bar";
import { QueueAgentTools } from "@/components/QueueAgentTools";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, canonicalFor } from "@/components/seo/Seo";
import { useQueue } from "@/store/queue";
import { formatBytes } from "@/lib/files";
import { POPULAR_SLUGS, getTool } from "@/lib/tools";

const Index = () => {
  const items = useQueue((s) => s.items);
  const addFiles = useQueue((s) => s.addFiles);
  const clear = useQueue((s) => s.clear);

  const totalIn = items.reduce((sum, i) => sum + i.originalSize, 0);
  const totalOut = items.reduce((sum, i) => sum + (i.outputSize ?? 0), 0);
  const doneItems = items.filter((i) => i.status === "done");
  const savedPct =
    totalIn > 0 && totalOut > 0 ? Math.round((1 - totalOut / totalIn) * 100) : 0;

  const popular = POPULAR_SLUGS.map(getTool).filter(
    (t): t is NonNullable<typeof t> => !!t
  );

  const downloadZip = async () => {
    if (doneItems.length === 0) return;
    const zip = new JSZip();
    for (const it of doneItems) {
      const out = await finalizeOutput(it);
      if (out) zip.file(out.name, out.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `squished-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen">
      <Seo
        title="Squished — Compress & Convert Files in Your Browser, Free"
        description="Compress and convert images, audio, and video locally in your browser. Free, private, no upload. Supports MP3, MP4, JPG, PNG, WAV, WebP and more."
        canonical={canonicalFor("/")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Squished",
          url: canonicalFor("/"),
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-gradient-hero" />

      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/70 ring-1 ring-foreground/10">
            <span className="size-1.5 rounded-full bg-primary" />
            Original files stay on your device
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Compress and convert files <br className="hidden sm:block" />
            <span className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              in your browser.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Drop images, audio, or video and shrink them on your device. No account required for compression.
          </p>
        </section>

        <section className="mt-8">
          <RecipeBar />
          <DropZone onFiles={addFiles} />
        </section>

        {items.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{items.length}</span>{" "}
                <span className="text-muted-foreground">
                  {items.length === 1 ? "file" : "files"}
                </span>
                {totalOut > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    · {formatBytes(totalIn)} → {formatBytes(totalOut)}
                    {savedPct > 0 && (
                      <span className="ml-1.5 font-semibold text-foreground">
                        −{savedPct}%
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LocalSeoDialog />
                <ShareReceipt />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="text-muted-foreground"
                >
                  <Trash2 className="size-4" /> Clear
                </Button>
                <Button
                  size="sm"
                  onClick={downloadZip}
                  disabled={doneItems.length < 2}
                >
                  <Download className="size-4" /> Download all
                </Button>
              </div>
            </div>

            <BulkControls />
            <QueueAgentTools />

            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <FileRow key={it.id} id={it.id} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-20">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Popular tools</h2>
            <Link to="/tools" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((t) => (
              <Link
                key={t.slug}
                to={`/${t.slug}`}
                className="group flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary"
              >
                <span className="font-medium">{t.label}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <section id="privacy" className="mt-16 rounded-2xl border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Why in-browser?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compression and conversion run on your device. Your original files are never uploaded.
            If you choose to connect Claude, only the SEO details you explicitly save are stored privately in your account.
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-lg bg-muted/50 p-3">
              <strong className="font-display">Private.</strong>
              <span className="ml-1 text-muted-foreground">No upload, no logs.</span>
            </li>
            <li className="rounded-lg bg-muted/50 p-3">
              <strong className="font-display">Fast.</strong>
              <span className="ml-1 text-muted-foreground">No round-trip wait.</span>
            </li>
            <li className="rounded-lg bg-muted/50 p-3">
              <strong className="font-display">Free.</strong>
              <span className="ml-1 text-muted-foreground">No quotas, no signup.</span>
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
