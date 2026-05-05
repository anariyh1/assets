import * as Yoga from "graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs, resolvers } from "@/graphql-gql";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/d1";
import * as dbSchema from "@/schema";
import type { GraphQLContext } from "@/graphql-gql/context";
import { getCloudflareEnv } from "@/lib/cloudflare-env";
export const runtime = "nodejs";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const LOCAL_BINDINGS_DISABLED_MESSAGE =
  "Cloudflare bindings are disabled for local dev. Use npm run dev:cf only when you intentionally need remote D1.";

function withCors(response: Response): Response {
  const next = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  Object.entries(CORS_HEADERS).forEach(([key, value]) => next.headers.set(key, value));
  return next;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Internal server error";
}

function logGraphqlError(method: string, request: NextRequest, err: unknown) {
  console.error("[GraphQL]", method, request.nextUrl.pathname, {
    message: errorMessage(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function cloudflareBindingsDisabledResponse() {
  return withCors(
    Response.json(
      { errors: [{ message: LOCAL_BINDINGS_DISABLED_MESSAGE }] },
      { status: 503 },
    ),
  );
}

function shouldBypassGraphql() {
  return process.env.OPENNEXT_USE_CF_BINDINGS === "false";
}

const { handleRequest } = Yoga.createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response, Request },
  maskedErrors: false,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  },
  context: async (): Promise<GraphQLContext> => {
    const env = await getCloudflareEnv();
    const envTyped = env as GraphQLContext["env"];
    const db = drizzle(env.DB, { schema: dbSchema });

    return {
      env: envTyped,
      db,
      userId: null,
    };
  },
});

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(request: NextRequest, _context: RouteContext) {
  const hasQuery =
    request.nextUrl.searchParams.has("query") ||
    request.nextUrl.searchParams.has("operationName") ||
    request.nextUrl.searchParams.has("variables") ||
    request.nextUrl.searchParams.has("extensions");

  if (hasQuery) {
    if (shouldBypassGraphql()) {
      return cloudflareBindingsDisabledResponse();
    }

    try {
      const res = await handleRequest(request, _context as unknown as never);
      return withCors(res);
    } catch (err) {
      logGraphqlError("GET", request, err);
      const body = JSON.stringify({
        errors: [{ message: errorMessage(err) }],
      });
      return withCors(new Response(body, { status: 500, headers: { "Content-Type": "application/json" } }));
    }
  }

  const explorer = new URL("https://studio.apollographql.com/sandbox/explorer");
  explorer.searchParams.set(
    "endpoint",
    `${request.nextUrl.origin}/api/graphql`,
  );
  return NextResponse.redirect(explorer, 302);
}

export async function POST(request: NextRequest, _context: RouteContext) {
  if (shouldBypassGraphql()) {
    return cloudflareBindingsDisabledResponse();
  }

  try {
    const res = await handleRequest(request, _context as unknown as never);
    return withCors(res);
  } catch (err) {
    logGraphqlError("POST", request, err);
    const body = JSON.stringify({
      errors: [{ message: errorMessage(err) }],
    });
    return withCors(new Response(body, { status: 500, headers: { "Content-Type": "application/json" } }));
  }
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}
