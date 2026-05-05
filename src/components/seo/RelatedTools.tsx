import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getTool } from "@/lib/tools";

export function RelatedTools({ slugs }: { slugs: string[] }) {
  const tools = slugs.map(getTool).filter((t): t is NonNullable<typeof t> => !!t);
  if (tools.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <Link
          key={t.slug}
          to={`/${t.slug}`}
          className="group flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary hover:bg-card/80"
        >
          <span className="font-medium">{t.label}</span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      ))}
    </div>
  );
}
