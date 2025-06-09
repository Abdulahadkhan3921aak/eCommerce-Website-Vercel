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

    // Handle admin routes
    if (isAdminRoute(req)) {

        // Use auth.protect to enforce authentication and role-based access.
        // Clerk's protect function will handle redirection if conditions are not met.
        auth.protect((sessionClaims) => {
            // Check if the user has the 'admin' role in their privateMetadata.
            // Ensure your admin users have {"role": "admin"} in their privateMetadata in the Clerk dashboard.
            const userRole = sessionClaims?.privateMetadata?.role as string | undefined;
            return userRole === 'admin' || userRole === 'owner';
        }, {
            // Redirect to sign-in if not authenticated
            unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
            // Redirect to home page (or a specific "unauthorized" page) if authenticated but not an admin
            unauthorizedUrl: '/?error=unauthorized',
        });

        // If auth.protect() does not throw an error or redirect, it means the user is authenticated and authorized.
        // Proceed with the request.
        return NextResponse.next();
    }

    // Handle other protected routes that are not admin-specific
    if (isGeneralProtectedRoute(req)) {

        // Protect the route, just requires authentication, no specific role check here.
        auth.protect(undefined, { // Passing undefined means only authentication is checked
            unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
        });

        return NextResponse.next();
    }

    // For public routes, allow access
    return NextResponse.next();
}, { debug: false }); // Enable Clerk debug mode for more detailed logs

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
