import { useMemo } from "react";
import { useParams } from "react-router-dom";
import JSZip from "jszip";
import { Download, Trash2 } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { FileRow } from "@/components/FileRow";
import { BulkControls } from "@/components/BulkControls";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, canonicalFor } from "@/components/seo/Seo";
import { Faq } from "@/components/seo/Faq";
import { HowItWorks } from "@/components/seo/HowItWorks";
import { RelatedTools } from "@/components/seo/RelatedTools";
import { acceptString, getTool } from "@/lib/tools";
import { useQueue } from "@/store/queue";
import { formatBytes } from "@/lib/files";
import NotFound from "./NotFound";

const ToolPage = () => {
  const { slug = "" } = useParams();
  const tool = getTool(slug);

  const items = useQueue((s) => s.items);
  const addFiles = useQueue((s) => s.addFiles);
  const clear = useQueue((s) => s.clear);

  const totalIn = items.reduce((sum, i) => sum + i.originalSize, 0);
  const totalOut = items.reduce((sum, i) => sum + (i.outputSize ?? 0), 0);
  const doneItems = items.filter((i) => i.status === "done");
  const savedPct =
    totalIn > 0 && totalOut > 0 ? Math.round((1 - totalOut / totalIn) * 100) : 0;

  const jsonLd = useMemo(() => {
    if (!tool) return undefined;
    return [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: `Squished — ${tool.label}`,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        description: tool.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: tool.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: canonicalFor("/") },
          { "@type": "ListItem", position: 2, name: "Tools", item: canonicalFor("/tools") },
          { "@type": "ListItem", position: 3, name: tool.label, item: canonicalFor(`/${tool.slug}`) },
        ],
      },
    ];
  }, [tool]);

  if (!tool) return <NotFound />;

  const downloadZip = async () => {
    if (doneItems.length === 0) return;
    const zip = new JSZip();
    for (const it of doneItems) {
      if (it.output && it.outputName) zip.file(it.outputName, it.output);
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

  const handleFiles = (files: FileList | File[]) => {
    addFiles(files, { targetFormat: tool.targetFormat });
  };

  return (
    <div className="relative min-h-screen">
      <Seo
        title={tool.title}
        description={tool.description}
        canonical={canonicalFor(`/${tool.slug}`)}
        jsonLd={jsonLd}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-gradient-hero" />

      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/70 ring-1 ring-foreground/10">
            <span className="size-1.5 rounded-full bg-primary" />
            Nothing is uploaded
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {tool.h1}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            {tool.intro}
          </p>
        </section>

        <section className="mt-8">
          <DropZone
            onFiles={handleFiles}
            accept={acceptString(tool)}
            title={`Drop your ${tool.inputExt[0].toUpperCase()} ${
              tool.category === "image" ? "images" : tool.category === "video" ? "videos" : "files"
            }`}
            hint={`${tool.inputExt.map((e) => `.${e}`).join(", ")} — processed entirely in your browser`}
          />
        </section>

        {items.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
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
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
                  <Trash2 className="size-4" /> Clear
                </Button>
                <Button size="sm" onClick={downloadZip} disabled={doneItems.length < 2}>
                  <Download className="size-4" /> Download all
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <FileRow key={it.id} id={it.id} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold">How it works</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Three steps. No accounts, no servers.
          </p>
          <div className="mt-4">
            <HowItWorks />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Frequently asked questions</h2>
          <div className="mt-3 rounded-2xl border bg-card p-2 sm:p-4">
            <Faq items={tool.faq} />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Related tools</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Other free, in-browser tools you might need.
          </p>
          <div className="mt-4">
            <RelatedTools slugs={tool.related} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ToolPage;
