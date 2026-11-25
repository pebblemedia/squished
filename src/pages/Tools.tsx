import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, canonicalFor } from "@/components/seo/Seo";
import { TOOLS, type ToolCategory } from "@/lib/tools";

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  fit: "Make it fit",
  pdf: "PDF",
  image: "Image",
  audio: "Audio",
  video: "Video",
};

const Tools = () => {
  const grouped: Record<ToolCategory, typeof TOOLS> = {
    fit: TOOLS.filter((t) => t.category === "fit"),
    pdf: TOOLS.filter((t) => t.category === "pdf"),
    image: TOOLS.filter((t) => t.category === "image"),
    audio: TOOLS.filter((t) => t.category === "audio"),
    video: TOOLS.filter((t) => t.category === "video"),
  };

  return (
    <div className="relative min-h-screen">
      <Seo
        title="All Tools — Compress & Convert Files in Your Browser | Squished"
        description="Every Squished tool in one place. Compress and convert MP3, MP4, JPG, PNG, WAV, WebP and more — free, private, no upload."
        canonical={canonicalFor("/tools")}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-hero" />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-12">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            All tools
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Free in-browser tools to compress and convert audio, video, and images.
            Nothing is uploaded — everything runs on your device.
          </p>
        </section>

        <div className="mt-12 space-y-12">
          {(Object.keys(grouped) as ToolCategory[]).map((cat) => (
            <section key={cat}>
              <h2 className="font-display text-xl font-semibold">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[cat].map((t) => (
                  <Link
                    key={t.slug}
                    to={`/${t.slug}`}
                    className="group flex items-start justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{t.label}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Tools;
