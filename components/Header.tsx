'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { useCart } from '@/lib/contexts/CartContext'
import CartNotification from './ui/CartNotification'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const { getTotalItems } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    fetchUserRole()
    setIsHydrated(true)
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/admin/current-user')
      if (response.ok) {
        const data = await response.json()
        if (typeof data.role === 'string' && !data.permissions) {
          setUserRole({
            role: data.role as 'customer' | 'admin' | 'owner',
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
    setIsMobileMenuOpen(prev => !prev)
  }

  const getLinkClasses = (path: string) => {
    return pathname === path
      ? 'text-purple-600 font-medium'
      : 'text-gray-700 hover:text-purple-600 transition-colors'
  }

  const totalItems = getTotalItems()

  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="brand-name text-4xl text-gray-900 tracking-wide leading-tight"
            >
              <span className="lavender-b">B</span>utterflies <span className="lavender-b">B</span>eading
            </Link>

            <nav className="hidden md:flex space-x-8">
              <Link href="/products" className={getLinkClasses('/products')}>
                Products
              </Link>
              <Link href="/custom" className={getLinkClasses('/custom')}>
                Custom Orders
              </Link>
              <Link href="/contact" className={getLinkClasses('/contact')}>
                Contact Us
              </Link>
              <Link href="/cart" className={`${getLinkClasses('/cart')} relative`}>
                Cart
                {isHydrated && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

              {!loading && isAdmin && (
                <Link href="/admin" className={`${getLinkClasses('/admin')} flex items-center space-x-1`} suppressHydrationWarning>
                  <span>Admin</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066
                      c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426
                      1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37
                      2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724
                      1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0
                      00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0
                      001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07
                      2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {userRole?.role === 'admin' && (
                    <span className="ml-1 text-xs text-red-500 font-semibold" suppressHydrationWarning>(admin)</span>
                  )}
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-primary text-sm px-4 py-2">Sign In</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-md text-gray-700 hover:text-purple-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              <Link
                href="/products"
                className={`block px-3 py-2 rounded-md text-base ${getLinkClasses('/products')}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                href="/custom"
                className={`block px-3 py-2 rounded-md text-base ${getLinkClasses('/custom')}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Custom Orders
              </Link>
              <Link
                href="/contact"
                className={`block px-3 py-2 rounded-md text-base ${getLinkClasses('/contact')}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
              <Link
                href="/cart"
                className={`block px-3 py-2 rounded-md text-base ${getLinkClasses('/cart')} relative`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cart
                {isHydrated && totalItems > 0 && (
                  <span className="ml-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 inline-flex items-center justify-center" suppressHydrationWarning>
                    {totalItems}
                  </span>
                )}
              </Link>
              {!loading && isAdmin && (
                <Link
                  href="/admin"
                  className={`block px-3 py-2 rounded-md text-base ${getLinkClasses('/admin')}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  suppressHydrationWarning
                >
                  Admin Dashboard
                  {userRole?.role === 'admin' && (
                    <span className="ml-1 text-xs text-red-500 font-semibold" suppressHydrationWarning>(admin)</span>
                  )}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      <CartNotification />
    </>
  )
}
