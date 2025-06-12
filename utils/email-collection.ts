import { User } from '@clerk/nextjs/server'

/**
 * Utility function to extract customer email from various sources
 */
export function extractCustomerEmail(user: User | null): string | null {
    if (!user) return null

    // Try multiple email sources in order of preference
    const emailSources = [
        user.primaryEmailAddress?.emailAddress,
        user.emailAddresses?.find(email => email.verification?.status === 'verified')?.emailAddress,
        user.emailAddresses?.[0]?.emailAddress
    ]

    return emailSources.find(email => email && isValidEmail(email)) || null
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Ensure customer email is present for order processing
 */
export function validateCustomerEmail(email: string | null | undefined): { isValid: boolean; error?: string } {
    if (!email) {
        return {
            isValid: false,
            error: 'Customer email is required for order processing. Please ensure your email is verified.'
        }
    }

    if (!isValidEmail(email)) {
        return {
            isValid: false,
            error: 'Please provide a valid email address.'
        }
    }

    return { isValid: true }
}

/**
 * Standardize shipping address with email
 */
export function standardizeShippingAddress(address: any, customerEmail: string) {
    return {
        name: address.name || '',
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        state: address.state || '',
        postal_code: address.postalCode || address.postal_code || '',
        country: address.country || 'US',
        phone: address.phone || '',
        email: customerEmail // Always use verified customer email
    }
}
