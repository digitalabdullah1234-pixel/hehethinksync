import { NextResponse, type NextRequest } from "next/server";
import { isAdminHost, requestHost } from "@/lib/admin-host";
import { ADMIN_COOKIE, validToken } from "@/lib/admin-token";

/**
 * The admin on its own domain (see admin-host.ts). There the panel has clean
 * addresses (/, /login, /services/web) that map onto the app's /admin pages;
 * on the site's domain /admin answers "not found". Both domains point at this
 * one app, so a save in the panel reaches the site at once: same data folder,
 * same page cache. Locally the panel is at admin.localhost:3000.
 */
const isAdminPath = (path: string) => path === "/admin" || path.startsWith("/admin/");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const admin = isAdminHost(requestHost(request.headers));
  // The app's page for this address: on the admin's domain, everything lives under /admin.
  const page = admin ? `/admin${pathname === "/" ? "" : pathname}` : pathname;

  /*
   * Posts. The site's pages take none (the contact form posts to /api/contact),
   * and in the panel only the sign-in form may post without a signed-in admin.
   * The actions check the session again; this turns strangers away before
   * Next reads a body that may be up to 75 MB.
   */
  if (request.method === "POST" && !pathname.startsWith("/api/")) {
    if (!admin) return new NextResponse("Method not allowed", { status: 405 });
    if (page !== "/admin/login" && !validToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (admin) {
    // The uploaded pictures the panel previews.
    if (pathname.startsWith("/media/")) return NextResponse.next();
    // An old /admin/… address: the same page without the prefix. Next sends a
    // same-domain address on as a relative one, so it stays right behind
    // Cloudflare/Traefik whether they speak http or https.
    if (isAdminPath(pathname)) {
      return NextResponse.redirect(new URL((pathname.slice("/admin".length) || "/") + search, request.url), 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = page;
    return NextResponse.rewrite(url);
  }
  // An address that matches no page, so the site's own "not found" page answers.
  if (isAdminPath(pathname)) return NextResponse.rewrite(new URL("/__admin-elsewhere", request.url));
  return NextResponse.next();
}

export const config = {
  // Pages and actions only: Next's own files and anything with a file extension pass straight through.
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
