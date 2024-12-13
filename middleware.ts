/* eslint-disable @typescript-eslint/no-unused-vars */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that do not require authentication
const publicRoutes = createRouteMatcher([
  '/',               // Home
  '/api/webhook/register', // Webhook
  '/sign-in',        // Sign-in page
  '/sign-up',        // Sign-up page
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId, sessionClaims, redirectToSignIn } = await auth();
    const role = sessionClaims?.role || 'user'; // Assuming `role` is stored in Clerk's session claims

    // Public route access
    if (publicRoutes(req)) {
      if (userId) {
        // Redirect authenticated users trying to access public routes
        return NextResponse.redirect(
          new URL(
            role === 'admin' ? '/admin/dashboard' : '/dashboard',
            req.nextUrl.origin // Use req.nextUrl.origin for base URL
          )
        );
      }
      return NextResponse.next();
    }

    // Handle non-authenticated users
    if (!userId) {
      return redirectToSignIn();
    }

    // Role-based redirection logic
    if (role === 'admin' && req.nextUrl.pathname === '/dashboard') {
      return NextResponse.redirect(
        new URL('/admin/dashboard', req.nextUrl.origin) // Proper URL construction
      );
    }

    if (role !== 'admin' && req.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(
        new URL('/dashboard', req.nextUrl.origin) // Proper URL construction
      );
    }

    // Allow access if no conditions match
    return NextResponse.next();
  } catch (error) {
    console.error('Error fetching user data from Clerk:', error);
    return NextResponse.redirect(new URL('/error', req.nextUrl.origin)); // Proper URL construction
  }
});

// Configuration to specify which routes the middleware applies to
export const config = {
  matcher: [
    // Exclude static files and Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Apply middleware to API and tRPC routes
    '/(api|trpc)(.*)',
  ],
};
