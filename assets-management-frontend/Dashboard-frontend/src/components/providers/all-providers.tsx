"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ApolloProviderWrapper } from "./apollo-provider";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";

export function AllProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <ApolloProviderWrapper>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ApolloProviderWrapper>
      </SessionProvider>
    </ThemeProvider>
  );
}
