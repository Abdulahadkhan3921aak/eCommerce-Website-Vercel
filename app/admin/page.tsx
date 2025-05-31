'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded) {
      checkAdminAccess()
    }
  }, [isLoaded, user])

  const checkAdminAccess = async () => {
    if (!user) {
      router.push('/sign-in')
      return
    }

    try {
      const response = await fetch('/api/admin/current-user')
      if (response.ok) {
        const data = await response.json()
        if (data.role === 'admin' || data.role === 'owner') {
          setIsAuthorized(true)
        } else {
          // User is authenticated but not an admin
          router.push('/')
        }
      } else {
        // API call failed, redirect to sign-in
        router.push('/sign-in')
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}
