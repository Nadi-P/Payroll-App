"use client";

import { DirectionProvider } from "@radix-ui/react-direction";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

export function AppProviders({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <DirectionProvider dir={dir}>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </DirectionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
