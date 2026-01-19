import { NextResponse } from 'next/server';
// Public routes that don't require authentication
const publicRoutes = ['/login', '/verify-code'];
// Onboarding routes that require authentication but not onboarding
const onboardingRoutes = ['/onboarding'];
// Protected routes that require authentication and onboarding
const protectedRoutes = ['/dashboard'];
export function middleware(request) {
  const { pathname } = request.nextUrl;
  // Get auth token and user from cookies
  const token = request.cookies.get('auth_token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch {
      // Invalid user cookie, treat as not authenticated
      user = null;
    }
  }
  const isAuthenticated = !!token && !!user;
  const isOnboarded = user?.isOnboarded ?? false;
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  // Check if current path is an onboarding route
  const isOnboardingRoute = onboardingRoutes.some((route) =>
    pathname.startsWith(route)
  );
  // Check if current path is a protected route
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) ||
    (!isPublicRoute && !isOnboardingRoute && pathname !== '/');
  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  // If authenticated but not onboarded and trying to access protected route (not onboarding), redirect to onboarding
  if (
    isAuthenticated &&
    !isOnboarded &&
    isProtectedRoute &&
    !isOnboardingRoute
  ) {
    const onboardingUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(onboardingUrl);
  }
  // If authenticated and onboarded and trying to access login/verify-code, redirect to dashboard
  if (isAuthenticated && isOnboarded && isPublicRoute) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  // If authenticated and onboarded and trying to access onboarding, redirect to dashboard
  // Exception: allow access to /onboarding/stripe for onboarded users (they can set up subscription from billing page)
  if (
    isAuthenticated &&
    isOnboarded &&
    isOnboardingRoute &&
    !pathname.startsWith('/onboarding/stripe')
  ) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  // If authenticated and account deletion has been requested, redirect to deletion notice page
  // (except if already on deletion page or trying to access export endpoints)
  if (isAuthenticated && user?.deleteRequestedAt) {
    const isDeletionPage = pathname.startsWith('/account-deletion');
    const isExportEndpoint = pathname.includes('/subscribers/export');
    if (!isDeletionPage && !isExportEndpoint) {
      const deletionUrl = new URL('/account-deletion', request.url);
      return NextResponse.redirect(deletionUrl);
    }
  }
  // Allow access
  return NextResponse.next();
}
// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
