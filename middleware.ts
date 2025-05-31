import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Matches routes that require admin privileges
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

// Matches other routes that require general authentication but not necessarily admin role
const isGeneralProtectedRoute = createRouteMatcher([
  '/checkout(.*)',
  // Add other routes like '/profile', '/orders', etc.
]);

export default clerkMiddleware((auth, req) => {
  // Initial log to see the state of auth.userId as Clerk middleware sees it
  console.log(`Middleware: Request to ${req.url}. Initial auth.userId from Clerk: ${auth.userId}`);

  // Handle admin routes
  if (isAdminRoute(req)) {
    console.log(`Middleware: Route ${req.url} is an admin route. Applying admin protection.`);
    
    // Use auth.protect to enforce authentication and role-based access.
    // Clerk's protect function will handle redirection if conditions are not met.
    auth.protect((sessionClaims) => {
      // Check if the user has the 'admin' role in their privateMetadata.
      // Ensure your admin users have {"role": "admin"} in their privateMetadata in the Clerk dashboard.
      const userRole = sessionClaims?.privateMetadata?.role as string | undefined;
      console.log(`Middleware (Admin Protect): Checking role. User role from sessionClaims.privateMetadata: ${userRole}`);
      return userRole === 'admin';
    }, {
      // Redirect to sign-in if not authenticated
      unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
      // Redirect to home page (or a specific "unauthorized" page) if authenticated but not an admin
      unauthorizedUrl: '/', 
    });

    // If auth.protect() does not throw an error or redirect, it means the user is authenticated and authorized.
    // Proceed with the request.
    console.log(`Middleware: Admin route ${req.url} access GRANTED after protect() call.`);
    return NextResponse.next();
  }

  // Handle other protected routes that are not admin-specific
  if (isGeneralProtectedRoute(req)) {
    console.log(`Middleware: Route ${req.url} is a general protected route. Applying general protection.`);
    
    // Protect the route, just requires authentication, no specific role check here.
    auth.protect(undefined, { // Passing undefined means only authentication is checked
        unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
    });

    console.log(`Middleware: General protected route ${req.url} access GRANTED after protect() call.`);
    return NextResponse.next();
  }

  // For public routes, allow access
  console.log(`Middleware: Route ${req.url} is public. Allowing access.`);
  return NextResponse.next();
}, { debug: true }); // Enable Clerk debug mode for more detailed logs

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
