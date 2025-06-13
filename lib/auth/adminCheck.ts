import { auth, currentUser } from '@clerk/nextjs/server'

export interface UserRole {
  role: 'customer' | 'admin'
  isAdmin: boolean
}

export async function getCurrentUserRole(): Promise<UserRole> {
  console.log('👤 [AdminCheck] Getting current user role');

  try {
    const user = await currentUser()

    if (!user) {
      console.log('❌ [AdminCheck] No user found - defaulting to customer');
      return { role: 'customer', isAdmin: false }
    }

    const role = user.privateMetadata?.role as string
    console.log('🏷️ [AdminCheck] User role from metadata:', role);

    // Default to customer if no role exists
    if (role === 'admin') {
      console.log('✅ [AdminCheck] Admin role confirmed');
      return { role: 'admin', isAdmin: true }
    }

    console.log('👥 [AdminCheck] Customer role assigned');
    return { role: 'customer', isAdmin: false }
  } catch (error) {
    console.error('❌ [AdminCheck] Error getting user role:', error)
    return { role: 'customer', isAdmin: false }
  }
}

export async function isAdmin(): Promise<boolean> {
  console.log('🔐 [AdminCheck] Checking admin status');

  try {
    const user = await currentUser()

    if (!user) {
      console.log('❌ [AdminCheck] No user found for admin check');
      return false
    }

    // Check Clerk metadata for admin role
    const userRole = user.privateMetadata?.role as string
    const isAdminUser = userRole === 'admin'

    console.log('🏷️ [AdminCheck] Admin check result:', { userRole, isAdmin: isAdminUser });
    return isAdminUser
  } catch (error) {
    console.error('❌ [AdminCheck] Error checking admin status:', error)
    return false
  }
}

export async function requireAdmin() {
  console.log('🔒 [AdminCheck] Requiring admin access');

  const adminStatus = await isAdmin()

  if (!adminStatus) {
    console.error('❌ [AdminCheck] Admin access denied');
    throw new Error('Admin access required')
  }

  console.log('✅ [AdminCheck] Admin access granted');
  return true
}

export async function requirePermission(permission: string) {
  console.log('🔐 [AdminCheck] Checking permission:', permission);

  try {
    // First check auth session
    const { userId } = await auth()

    if (!userId) {
      console.error('❌ [AdminCheck] No user ID found');
      throw new Error('Authentication required')
    }

    const user = await currentUser()

    if (!user) {
      console.error('❌ [AdminCheck] User not found');
      throw new Error('User not found')
    }

    // Check Clerk metadata for admin role
    const userRole = user.privateMetadata?.role as string
    console.log('🏷️ [AdminCheck] User role from metadata:', userRole);

    if (userRole !== 'admin' && userRole !== 'owner') {
      console.error('❌ [AdminCheck] Insufficient permissions - role:', userRole);
      throw new Error('Admin access required')
    }

    console.log('✅ [AdminCheck] Permission granted for', userRole, 'user');
    return true
  } catch (error) {
    console.error('❌ [AdminCheck] Error checking permission:', error)
    throw error
  }
}

// New function to validate shipping requirements
export function validateShippingRequirements(order: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if shipping details are set
  if (!order.shippingWeight || order.shippingWeight <= 0) {
    errors.push('Shipping weight must be set and greater than 0')
  }

  if (!order.shippingDimensions ||
    !order.shippingDimensions.length ||
    !order.shippingDimensions.width ||
    !order.shippingDimensions.height ||
    order.shippingDimensions.length <= 0 ||
    order.shippingDimensions.width <= 0 ||
    order.shippingDimensions.height <= 0) {
    errors.push('All shipping dimensions (length, width, height) must be set and greater than 0')
  }

  // Validate units if provided
  if (order.shippingDimensions?.unit && !['in', 'cm'].includes(order.shippingDimensions.unit)) {
    errors.push('Invalid dimension unit. Must be "in" or "cm"')
  }

  if (order.shippingWeightUnit && !['lb', 'kg'].includes(order.shippingWeightUnit)) {
    errors.push('Invalid weight unit. Must be "lb" or "kg"')
  }

  // Check if shipping rate is selected
  if (!order.shippoShipment?.rateId) {
    errors.push('A shipping rate must be selected before approval')
  }

  // Check if tax has been explicitly set (can be zero, but must be explicitly set)
  if (!order.isTaxSet) {
    errors.push('Tax amount must be set before generating payment (can be $0.00)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
