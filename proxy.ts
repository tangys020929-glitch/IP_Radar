import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const backendOrigin = process.env.CLOUDFLARE_BACKEND_ORIGIN;
  if (!backendOrigin) {
    return NextResponse.json(
      { error: "CLOUDFLARE_BACKEND_ORIGIN is not configured" },
      { status: 503 },
    );
  }

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, backendOrigin);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-forwarded-host", request.nextUrl.host);

  return NextResponse.rewrite(destination, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
