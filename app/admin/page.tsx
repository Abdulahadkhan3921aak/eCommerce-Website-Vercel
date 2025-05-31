'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from "@/components/Header"

export default function AdminDashboard() {
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUserRole()
  }, [])

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch('/api/admin/current-user')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserRole(data.role)
      }
    } catch (error) {
      console.error('Error fetching current user role:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your store and content</p>
            </div>
            <div className="text-sm text-gray-500">
              Your Role: <span className="font-medium text-purple-600 capitalize">{currentUserRole}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/products"
            className="card card-hover group p-6 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-200"
          >
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-purple-600">
              Product Management
            </h3>
            <p className="mt-2 text-gray-600">
              Add, edit, and manage your product inventory
            </p>
          </Link>

          <Link
            href="/admin/orders"
            className="card card-hover group p-6 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-200"
          >
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-green-600">
              Order Management
            </h3>
            <p className="mt-2 text-gray-600">
              View and manage customer orders and fulfillment
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="card card-hover group p-6 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-200"
          >
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Analytics
            </h3>
            <p className="mt-2 text-gray-600">
              View store performance and sales analytics
            </p>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">-</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">-</div>
              <div className="text-sm text-gray-600">Pending Orders</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">-</div>
              <div className="text-sm text-gray-600">Total Sales</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">-</div>
              <div className="text-sm text-gray-600">Low Stock Items</div>
            </div>
          </div>
        </div>

        {/* Role-based Notice */}
        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-purple-800 text-sm">
              {currentUserRole === 'owner' && "You have full access to all admin features including user management."}
              {currentUserRole === 'admin' && "You have access to product and order management features."}
              {!currentUserRole && "Loading your permissions..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
