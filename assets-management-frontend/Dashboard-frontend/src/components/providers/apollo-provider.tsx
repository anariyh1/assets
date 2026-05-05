"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ApolloClient,
  ApolloProvider,
  type DefaultOptions,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";

const graphqlEndpoint = "/api/graphql";

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

const defaultOptions: DefaultOptions = {
  watchQuery: {
    errorPolicy: "all",
  },
  query: {
    errorPolicy: "all",
  },
  mutate: {
    errorPolicy: "all",
  },
};

export function ApolloProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const client = useMemo(() => {
    return new ApolloClient({
      link: new HttpLink({ uri: graphqlEndpoint }),
      cache,
      defaultOptions,
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
