import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
};

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
        cacheHeaders?: Record<string, string>,
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

        // @supabase/ssr 0.6.x does not pass cache headers to setAll.
        // Never let a CDN cache a response that refreshes or clears an auth cookie.
        if (cookiesToSet.length > 0) {
          const headers = {
            "Cache-Control": "private, no-store",
            Expires: "Thu, 01 Jan 1970 00:00:00 GMT",
            Pragma: "no-cache",
            ...(cacheHeaders || {}),
          };
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        }
      },
    },
  });

  // Refresh and validate the cookie-backed session before Server Components run.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
