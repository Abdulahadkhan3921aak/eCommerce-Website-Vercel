import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Jewelry Store</h1>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link
                href="/products"
                className="text-gray-700 hover:text-gray-900"
              >
                Products
              </Link>
              <Link
                href="/custom"
                className="text-gray-700 hover:text-gray-900"
              >
                Custom Orders
              </Link>
              <Link href="/cart" className="text-gray-700 hover:text-gray-900">
                Cart
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800">
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
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Handmade Jewelry
                <span className="text-indigo-600"> & Custom Designs</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
                Discover beautiful handmade jewelry crafted with care. Personalize
                your pieces or choose from our curated collection. Free shipping on
                orders over $100.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/products"
                  className="rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Shop Collection
                </Link>
                <Link
                  href="/custom"
                  className="text-base font-semibold leading-7 text-gray-900 hover:text-gray-700"
                >
                  Custom Orders <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">✨</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">
                  Handcrafted
                </h3>
                <p className="mt-2 text-gray-600">
                  Each piece is carefully handmade with attention to detail
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">🎨</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">
                  Customizable
                </h3>
                <p className="mt-2 text-gray-600">
                  Personalize your jewelry with names, dates, or special messages
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">🚚</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">
                  Free Shipping
                </h3>
                <p className="mt-2 text-gray-600">
                  Complimentary shipping on all orders over $100
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Jewelry Store</h2>
            <p className="mt-4 text-gray-400">
              Handmade jewelry with love and care
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
