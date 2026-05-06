import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoFull from "@/assets/squished-logo.svg";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  /** Logo shown at the top of the page. Defaults to the bundled Squished mark. */
  logoFullSrc?: string;
  /** Logo shown when the header shrinks on scroll. Falls back to logoFullSrc. */
  logoShrunkSrc?: string;
}

export function SiteHeader({ logoFullSrc, logoShrunkSrc }: SiteHeaderProps = {}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fullSrc = logoFullSrc ?? logoFull;
  const shrunkSrc = logoShrunkSrc ?? fullSrc;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full transition-all duration-300",
        scrolled
          ? "border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-5xl items-center justify-between px-5 transition-all duration-300",
          scrolled ? "py-2" : "py-5 sm:py-6"
        )}
      >
        <Link to="/" className="flex items-center gap-0.5">
          <img
            src={scrolled ? shrunkSrc : fullSrc}
            alt="Squished logo"
            className={cn(
              "transition-all duration-300",
              scrolled ? "size-12" : "size-20"
            )}
          />
          <span
            className={cn(
              "font-display font-bold tracking-tight transition-all duration-300",
              scrolled ? "text-base" : "text-xl"
            )}
          >
            Squished
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <Link to="/tools" className="hover:text-foreground">
            All tools
          </Link>
          <span
            className={cn(
              "hidden transition-opacity duration-300 sm:inline",
              scrolled ? "opacity-0" : "opacity-100"
            )}
          >
            100% private · runs in your browser
          </span>
        </nav>
      </div>
    </header>
  );
}
