'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { useCart } from '@/lib/contexts/CartContext'

interface UserRole {
  role: 'customer' | 'admin' | 'owner'
  permissions: {
    canManageProducts: boolean
    canManageOrders: boolean
    canManageUsers: boolean
    canViewAnalytics: boolean
    canManageRoles: boolean
  }
}

export default function Header() {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu
  const { state } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/admin/current-user')
      if (response.ok) {
        const data = await response.json()
        // Ensure setUserRole is called with the correct structure if data.role is just a string
        // Assuming data is { role: 'admin' } or { role: 'customer', permissions: {...} }
        if (typeof data.role === 'string' && !data.permissions) {
          // If API only returns role string, construct a basic UserRole object
          setUserRole({
            role: data.role as 'customer' | 'admin' | 'owner',
            // Provide default permissions or fetch them if necessary
            permissions: { 
              canManageProducts: data.role === 'admin' || data.role === 'owner',
              canManageOrders: data.role === 'admin' || data.role === 'owner',
              canManageUsers: data.role === 'owner',
              canViewAnalytics: data.role === 'admin' || data.role === 'owner',
              canManageRoles: data.role === 'owner',
            }
          });
        } else {
          setUserRole(data);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'owner'

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getLinkClasses = (path: string) => {
    return pathname === path
      ? 'text-purple-600 font-medium'
      : 'text-gray-700 hover:text-purple-600 transition-colors'
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Jewelry Store
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link
              href="/products"
              className={getLinkClasses('/products')}
            >
              Products
            </Link>
            <Link
              href="/custom"
              className={getLinkClasses('/custom')}
            >
              Custom Orders
            </Link>
            <Link
              href="/cart"
              className={`${getLinkClasses('/cart')} relative`}
            >
              Cart
              {state.itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {state.itemCount}
                </span>
              )}
            </Link>

            {/* Admin Dashboard - Only visible to admins */}
            {!loading && isAdmin && (
              <Link
                href="/admin"
                className={`${getLinkClasses('/admin')} flex items-center space-x-1`}
              >
                <span>Admin</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-purple-600 focus:outline-none"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {userRole?.role === "admin" && (
              <span className="hidden sm:block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1)}
              </span>
            )}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-primary">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-xl z-40 border-t border-gray-200">
          <nav className="flex flex-col space-y-1 px-4 py-4">
            <Link href="/products" className={`${getLinkClasses('/products')} block px-3 py-2 rounded-md text-base font-medium`} onClick={() => setIsMobileMenuOpen(false)}>
              Products
            </Link>
            <Link href="/custom" className={`${getLinkClasses('/custom')} block px-3 py-2 rounded-md text-base font-medium`} onClick={() => setIsMobileMenuOpen(false)}>
              Custom Orders
            </Link>
            <Link href="/cart" className={`${getLinkClasses('/cart')} block px-3 py-2 rounded-md text-base font-medium relative`} onClick={() => setIsMobileMenuOpen(false)}>
              Cart
              {state.itemCount > 0 && (
                <span className="ml-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {state.itemCount}
                </span>
              )}
            </Link>
            {!loading && isAdmin && (
              <Link href="/admin" className={`${getLinkClasses('/admin')} block px-3 py-2 rounded-md text-base font-medium`} onClick={() => setIsMobileMenuOpen(false)}>
                Admin
              </Link>
            )}
            {/* Add Sign In/Out for mobile if needed */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              {/* UserButton might not be ideal here directly, consider a link to user profile page */}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
