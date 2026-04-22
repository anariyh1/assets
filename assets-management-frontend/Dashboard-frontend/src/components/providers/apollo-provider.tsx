"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";

const graphqlEndpoint =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/api/graphql";

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        assets: {
          merge: false,
        },
        assignments: {
          merge: false,
        },
        employees: {
          merge: false,
        },
        categories: {
          merge: false,
        },
        locations: {
          merge: false,
        },
        assetHistory: {
          merge: false,
        },
        dataWipeTasks: {
          merge: false,
        },
      },
    },
  },
});

export function ApolloProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const client = useMemo(() => {
    return new ApolloClient({
      link: new HttpLink({ uri: graphqlEndpoint }),
      cache,
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
