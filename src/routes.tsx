import type { RouteRecord } from "vite-react-ssg";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { registerServiceWorker } from "./features/incoming/api/shared-files";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Tools from "./pages/Tools";
import Limits from "./pages/Limits";
import ToolPage from "./pages/ToolPage";
import { TOOLS } from "./lib/tools";
import { AccountProvider } from "./hooks/use-account";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

function Layout() {
  useEffect(registerServiceWorker, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Outlet />
      </TooltipProvider>
      </AccountProvider>
    </QueryClientProvider>
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
      { path: "limits", element: <Limits /> },
      { path: "login", element: <Login /> },
      { path: "auth/callback", element: <AuthCallback /> },
      { path: ".lovable/oauth/consent", element: <OAuthConsent /> },
      {
        path: ":slug",
        element: <ToolPage />,
        getStaticPaths: () => TOOLS.map((t) => t.slug),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];
