import type { RouteRecord } from "vite-react-ssg";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Tools from "./pages/Tools";
import ToolPage from "./pages/ToolPage";
import { TOOLS } from "./lib/tools";

const queryClient = new QueryClient();

function Layout() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Outlet />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout />,
    entry: "src/routes.tsx",
    children: [
      { index: true, element: <Index /> },
      { path: "tools", element: <Tools /> },
      {
        path: ":slug",
        element: <ToolPage />,
        getStaticPaths: () => TOOLS.map((t) => t.slug),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];
