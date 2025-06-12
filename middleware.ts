import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Matches routes that require admin privileges
const isAdminRoute = createRouteMatcher([
    '/admin(.*)',
]);

// Matches API routes that have their own auth
const isAPIRoute = createRouteMatcher([
    '/api(.*)',
]);

// Matches other routes that require general authentication but not necessarily admin role
const isGeneralProtectedRoute = createRouteMatcher([
    '/checkout(.*)',
    // Add other routes like '/profile', '/orders', etc.
]);


export default clerkMiddleware((auth, req) => {

    // Skip middleware for API routes Q- let them handle their own auth
    if (isAPIRoute(req)) {
        return NextResponse.next();
    }

    // Handle admin routes (non-API)
    if (isAdminRoute(req)) {
        try {
            // Use auth.protect to enforce authentication and role-based access.
            auth.protect((sessionClaims) => {
                // Check if the user has the 'admin' role in their privateMetadata.
                const userRole = sessionClaims?.privateMetadata?.role as string | undefined;
                return userRole === 'admin' || userRole === 'owner';
            }, {
                // Redirect to sign-in if not authenticated
                unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
                // Redirect to home page (or a specific "unauthorized" page) if authenticated but not an admin
                unauthorizedUrl: '/?error=unauthorized',
            });

            return NextResponse.next();
        } catch (error) {
            // If there's an error in auth check, redirect to home with error
            console.error('Admin route auth error:', error);
            return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
        }
    }

    // Handle other protected routes that are not admin-specific
    if (isGeneralProtectedRoute(req)) {
        try {
            // Protect the route, just requires authentication, no specific role check here.
            auth.protect(undefined, { // Passing undefined means only authentication is checked
                unauthenticatedUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
            });

            return NextResponse.next();
        } catch (error) {
            console.error('General protected route auth error:', error);
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
    }

    // For public routes, allow access
    return NextResponse.next();
}, {
    debug: false,
    // Add publishableKey to prevent some auth issues
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
