import JSZip from "jszip";
import { Download, Trash2, Sparkles } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/ui/button";
import { useQueue } from "@/store/queue";
import { formatBytes } from "@/lib/files";

const Index = () => {
  const items = useQueue((s) => s.items);
  const addFiles = useQueue((s) => s.addFiles);
  const clear = useQueue((s) => s.clear);

  const totalIn = items.reduce((sum, i) => sum + i.originalSize, 0);
  const totalOut = items.reduce((sum, i) => sum + (i.outputSize ?? 0), 0);
  const doneItems = items.filter((i) => i.status === "done");
  const savedPct =
    totalIn > 0 && totalOut > 0 ? Math.round((1 - totalOut / totalIn) * 100) : 0;

  const downloadZip = async () => {
    if (doneItems.length === 0) return;
    const zip = new JSZip();
    for (const it of doneItems) {
      if (it.output && it.outputName) {
        zip.file(it.outputName, it.output);
      }
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-gradient-hero" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:py-6">
        <a href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Squished</span>
        </a>
        <a
          href="#privacy"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          100% private · runs in your browser
        </a>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/70 ring-1 ring-foreground/10">
            <span className="size-1.5 rounded-full bg-primary" />
            Nothing is uploaded
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Compress and convert files <br className="hidden sm:block" />
            <span className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              in your browser.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Drop images and shrink them on your device. No accounts, no uploads, no waiting.
          </p>
        </section>

        <section className="mt-8">
          <DropZone onFiles={addFiles} />
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

            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <FileRow key={it.id} id={it.id} />
              ))}
            </div>
          </section>
        )}

        <section id="privacy" className="mt-20 rounded-2xl border bg-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Why in-browser?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Squished runs entirely on your device using WebAssembly. Your files never touch
            our servers — we couldn't see them if we tried. That means it's faster, free,
            and private by default.
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

      <footer className="relative z-10 border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Squished</span>
          <span>Built with WebAssembly · Files never leave your device</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
