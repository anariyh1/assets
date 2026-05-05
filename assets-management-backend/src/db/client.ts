import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/schema";
import type { GraphQLContext } from "@/graphql-gql/context";
import { getCloudflareEnv } from "@/lib/cloudflare-env";

export async function getDb() {
  const env = await getCloudflareEnv();
  return drizzle(env.DB, { schema });
}

export function getDbFromContext(ctx: GraphQLContext) {
  return ctx.db;
}
