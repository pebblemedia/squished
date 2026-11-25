import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoFull from "@/assets/squished-logo-full.svg";
import logoIcon from "@/assets/squished-icon.svg";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, LogOut } from "lucide-react";

interface SiteHeaderProps {
  /** Logo shown at the top of the page. Defaults to the bundled Squished mark. */
  logoFullSrc?: string;
  /** Logo shown when the header shrinks on scroll. Falls back to logoFullSrc. */
  logoShrunkSrc?: string;
}

export function SiteHeader({ logoFullSrc, logoShrunkSrc }: SiteHeaderProps = {}) {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAccount();
  const [signoutError, setSignoutError] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fullSrc = logoFullSrc ?? logoFull;
  const shrunkSrc = logoShrunkSrc ?? logoIcon;

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
        <Link to="/" className="flex items-center" aria-label="Squished home">
          <img
            src={scrolled ? shrunkSrc : fullSrc}
            alt="Squished"
            className={cn(
              "transition-all duration-300 w-auto",
              scrolled ? "h-6" : "h-7 sm:h-8"
            )}
          />
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
            Files stay in your browser
          </span>
          {!loading && (user ? <Button variant="ghost" size="icon" aria-label="Sign out" title={signoutError ? "Couldn't sign out. Try again." : "Sign out"} onClick={() => void supabase.auth.signOut().then(({ error }) => setSignoutError(Boolean(error)), () => setSignoutError(true))}><LogOut className="size-4" /></Button> : <Button variant="outline" size="sm" asChild><Link to="/login?next=%2F"><LogIn className="size-4" />Sign in</Link></Button>)}
        </nav>
      </div>
    </header>
  );
}
