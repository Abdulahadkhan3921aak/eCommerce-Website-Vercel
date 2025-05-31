import { auth, currentUser } from '@clerk/nextjs/server'

export interface UserRole {
  role: 'customer' | 'admin'
  isAdmin: boolean
}

export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const user = await currentUser()

    if (!user) {
      return { role: 'customer', isAdmin: false }
    }

    const role = user.privateMetadata?.role as string
    // Default to customer if no role exists
    if (role === 'admin') {

      return { role: 'admin', isAdmin: true }
    }

    return { role: 'customer', isAdmin: false }
  } catch (error) {
    console.error('Error getting user role:', error)
    return { role: 'customer', isAdmin: false }
  }
}

export async function isAdmin(): Promise<boolean> {
  try {
    const user = await currentUser()


    if (!user) {
      return false
    }

    // Check Clerk metadata for admin role
    const userRole = user.privateMetadata?.role as string

    return userRole === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function requireAdmin() {
  const adminStatus = await isAdmin()

  if (!adminStatus) {
    throw new Error('Admin access required')
  }

  return true
}

export async function requirePermission(permission: string) {
  try {
    const user = await currentUser()

    if (!user) {
      throw new Error('Authentication required')
    }

    // Check Clerk metadata for admin role
    const userRole = user.privateMetadata?.role as string

    if (userRole !== 'admin' && userRole !== 'owner') {
      throw new Error('Admin access required')
    }

    // For now, if user is admin or owner, they have all permissions
    // You can extend this logic based on specific permission requirements
    return true
  } catch (error) {
    console.error('Error checking permission:', error)
    throw error
  }
}
