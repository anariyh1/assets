import type { NextRequest } from "next/server";

const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;

function forwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  return headers;
}

async function proxyGraphql(request: NextRequest) {
  if (!graphqlUrl) {
    return Response.json(
      { errors: [{ message: "NEXT_PUBLIC_GRAPHQL_URL is not configured" }] },
      { status: 500 },
    );
  }

  const targetUrl = new URL(graphqlUrl);
  if (request.method === "GET") {
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders(request),
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
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
