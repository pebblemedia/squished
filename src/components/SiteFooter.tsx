import { Link } from "react-router-dom";
import { TOOLS } from "@/lib/tools";

export function SiteFooter() {
  const groups = {
    audio: TOOLS.filter((t) => t.category === "audio"),
    video: TOOLS.filter((t) => t.category === "video"),
    image: TOOLS.filter((t) => t.category === "image"),
  };

  return (
    <footer className="relative z-10 border-t bg-card/30">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {(["audio", "video", "image"] as const).map((cat) => (
            <div key={cat}>
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                {cat}
              </h3>
              <ul className="mt-3 space-y-1.5">
                {groups[cat].map((t) => (
                  <li key={t.slug}>
                    <Link
                      to={`/${t.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Squished</span>
          <span>
            <Link to="/tools" className="hover:text-foreground">All tools</Link>
            {" · "}Built with WebAssembly · Files never leave your device
          </span>
        </div>
      </div>
    </footer>
  );
}
