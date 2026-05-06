import { Link } from "react-router-dom";
import logo from "@/assets/squished-logo.svg";

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:py-6">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="grid size-12 place-items-center rounded-xl bg-foreground p-1.5">
          <img src={logo} alt="Squished logo" className="size-full" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Squished</span>
      </Link>
      <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <Link to="/tools" className="hover:text-foreground">All tools</Link>
        <span className="hidden sm:inline">100% private · runs in your browser</span>
      </nav>
    </header>
  );
}
