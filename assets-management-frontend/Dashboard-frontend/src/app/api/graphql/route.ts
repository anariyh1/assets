import type { NextRequest } from "next/server";

const graphqlUrl =
  process.env.GRAPHQL_URL ??
  process.env.NEXT_PUBLIC_GRAPHQL_URL ??
  "http://localhost:4000/api/graphql";

function forwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  return headers;
}

function safeResponseHeaders(source: Headers) {
  const headers = new Headers();
  const blocked = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "transfer-encoding",
    "upgrade",
  ]);

  source.forEach((value, key) => {
    if (!blocked.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

function graphqlError(message: string, status: number) {
  return Response.json({ errors: [{ message }] }, { status });
}

async function proxyGraphql(request: NextRequest) {
  const targetUrl = new URL(graphqlUrl);
  if (request.method === "GET") {
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });
  }

  const controller = new AbortController();
  const timeoutMs = 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders(request),
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[GraphQL proxy] Backend timed out", {
        target: targetUrl.toString(),
        timeoutMs,
      });
      return graphqlError("Backend GraphQL timed out. Is localhost:4000 ready?", 504);
    }

    console.error("[GraphQL proxy] Backend unreachable", {
      target: targetUrl.toString(),
      message: error instanceof Error ? error.message : String(error),
    });
    return graphqlError("Backend GraphQL is unreachable. Start backend on localhost:4000.", 502);
  } finally {
    clearTimeout(timeout);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: safeResponseHeaders(response.headers),
  });
}

export async function POST(request: NextRequest) {
  return proxyGraphql(request);
}

export async function GET(request: NextRequest) {
  return proxyGraphql(request);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
