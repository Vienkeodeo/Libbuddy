import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "libbuddy_session";
const ADMIN_ROLES = ["Admin", "Librarian"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin routes require Admin or Librarian role
  if (pathname.startsWith("/admin")) {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!session.roles.some((role) => ADMIN_ROLES.includes(role))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Checkout requires authentication
  if (pathname.startsWith("/checkout")) {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login?redirect=/checkout", request.url));
    }
  }

  // My books requires authentication
  if (pathname.startsWith("/my-books")) {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login?redirect=/my-books", request.url));
    }
  }

  return NextResponse.next();
}

function parseSession(request: NextRequest): { id: string; roles: string[] } | null {
  const encoded = request.cookies.get(SESSION_COOKIE)?.value;
  if (!encoded) {
    return null;
  }

  try {
    const decoded = atob(encoded);
    const [id, rolesStr] = decoded.split("|");
    if (!id || !rolesStr) {
      return null;
    }
    return { id, roles: rolesStr.split(",").filter(Boolean) };
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/checkout/:path*", "/my-books/:path*"]
};
