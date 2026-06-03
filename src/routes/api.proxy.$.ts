import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_BACKEND_API_BASE = "https://backend.treatlyonline.de/api";

function getBackendApiBase() {
  const configured =
    process.env.API_URL?.trim() ||
    process.env.VITE_API_URL?.trim() ||
    DEFAULT_BACKEND_API_BASE;

  return configured.replace(/\/+$/, "");
}

function buildForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("content-length");

  return headers;
}

async function forwardRequest(request: Request, splat: string | undefined) {
  const targetPath = splat ?? "";
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${getBackendApiBase()}/${targetPath}`);
  targetUrl.search = incomingUrl.search;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request),
    body,
    redirect: "manual",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export const Route = createFileRoute("/api/proxy/$")({
  server: {
    handlers: {
      ANY: async ({ request, params }) => {
        return forwardRequest(request, params._splat);
      },
    },
  },
});
