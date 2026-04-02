import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Separate public routes
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook/register",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const pathname = req.nextUrl.pathname;

  const role = sessionClaims?.metadata?.role; // note that we have to inject our own type into the clerk type for sessionClaims, otherwise it will not recognize our own metadata. this is done in globals.d.ts, then this line will work.
  // clerk already knows that sessionClaims are based on the type CustomJwtSessionClaims, so whatever changes we make it will just merge it with the existing one.
  const isAdmin = role === "admin";

  try {
    // 1) Unauthenticated user on protected route
    if (!userId && !isPublicRoute(req)) {
      return redirectToSignIn(); // this is a function from the auth object.
    }

    // 2) Authenticated user on public auth pages
    if (
      userId &&
      (pathname === "/" ||
        pathname.startsWith("/sign-in") ||
        pathname.startsWith("/sign-up"))
    ) {
      // if it's admin then redirect to admin dashboard, otherwise normal dashboard (this is when the user is logged in but want to access sign-in sign-up route.)
      return NextResponse.redirect(
        new URL(isAdmin ? "/admin/dashboard" : "/dashboard", req.url),
      );
    }

    // 3) Admin user hitting normal dashboard -> redirect to admin dashboard
    if (userId && isAdmin && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // 4) Non-admin blocked from admin routes
    if (userId && !isAdmin && isAdminRoute(req)) {
      // For API requests, return 403 instead of redirecting
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/error", req.url));
  }

  return NextResponse.next();
});

// this matcher means run this file on every route.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
