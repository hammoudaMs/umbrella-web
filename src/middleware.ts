import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  TENANT_HEADER,
  TENANTS,
  tenantByPortalPath,
} from "@/tenants/registry";
import {
  extractSubdomain,
  resolveTenantFromHost,
  tenantMode,
} from "@/tenants/resolve";

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  process.env.NEXT_PUBLIC_USE_MOCK === "1";

const PUBLIC_ON_TENANT = new Set([
  "/login",
  "/track",
  "/signup",
  "/faq",
  "/forgot-password",
  "/reset-password",
  "/compte-en-attente",
  "/contact",
]);

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_ON_TENANT.has(pathname)) return true;
  if (pathname.startsWith("/track")) return true;
  if (pathname.startsWith("/legal")) return true;
  return false;
}

function needsAuth(pathname: string): boolean {
  return TENANTS.some(
    (t) => pathname === t.portalPath || pathname.startsWith(`${t.portalPath}/`),
  );
}

/** Keep portal HTML/RSC fresh — avoid sticky browser/CDN document caches. */
function withNoStore(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate",
  );
  res.headers.set("Pragma", "no-cache");
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const fromHost = resolveTenantFromHost(host);
  const mode = tenantMode();

  // Subdomain → internal portal path rewrite (shared deploy, tenant-isolated URLs)
  if (mode === "subdomain" && fromHost) {
    const tenant = fromHost.tenant;
    const alreadyPrefixed =
      pathname === tenant.portalPath ||
      pathname.startsWith(`${tenant.portalPath}/`);

    let rewritePath = pathname;
    if (!alreadyPrefixed && !isPublicPath(pathname)) {
      rewritePath =
        pathname === "/"
          ? tenant.portalPath
          : `${tenant.portalPath}${pathname}`;
    }

    const url = request.nextUrl.clone();
    url.pathname = rewritePath;

    const authedPath = needsAuth(rewritePath);
    if (authedPath && !USE_MOCK) {
      const hasSession = request.cookies.get("umbrella_auth")?.value === "1";
      if (!hasSession) {
        const login = request.nextUrl.clone();
        login.pathname = "/login";
        login.searchParams.set("next", rewritePath);
        login.searchParams.set("tenant", tenant.id);
        const res = NextResponse.redirect(login);
        res.headers.set(TENANT_HEADER, tenant.id);
        res.cookies.set("umbrella_tenant", tenant.id, {
          path: "/",
          sameSite: "lax",
        });
        return withNoStore(res);
      }
    }

    const res = NextResponse.rewrite(url);
    res.headers.set(TENANT_HEADER, tenant.id);
    res.cookies.set("umbrella_tenant", tenant.id, {
      path: "/",
      sameSite: "lax",
    });
    return withNoStore(res);
  }

  // Path mode (default): protect portal prefixes, stamp tenant cookie for login binding
  const pathTenant = tenantByPortalPath(pathname);
  if (pathTenant && needsAuth(pathname)) {
    if (!USE_MOCK) {
      const hasSession = request.cookies.get("umbrella_auth")?.value === "1";
      if (!hasSession) {
        const login = new URL("/login", request.url);
        login.searchParams.set("next", pathname);
        login.searchParams.set("tenant", pathTenant.id);
        const res = NextResponse.redirect(login);
        res.headers.set(TENANT_HEADER, pathTenant.id);
        res.cookies.set("umbrella_tenant", pathTenant.id, {
          path: "/",
          sameSite: "lax",
        });
        return withNoStore(res);
      }
    }
    const res = NextResponse.next();
    res.headers.set(TENANT_HEADER, pathTenant.id);
    res.cookies.set("umbrella_tenant", pathTenant.id, {
      path: "/",
      sameSite: "lax",
    });
    return withNoStore(res);
  }

  // Clear stale tenant cookie on hub hosts
  const sub = extractSubdomain(host);
  if (!sub && !pathTenant) {
    const res = NextResponse.next();
    res.cookies.delete("umbrella_tenant");
    return withNoStore(res);
  }

  return withNoStore(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
