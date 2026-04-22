"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProviderWrapper } from "./apollo-provider";
import { useState } from "react";

export function AllProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ApolloProviderWrapper>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApolloProviderWrapper>
  );
}
