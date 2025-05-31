import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";

// Add this function to fetch featured products
async function getFeaturedProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/products?featured=true&limit=6`,
      {
        cache: "no-store", // for development
      }
    );
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Main Banner */}
      <main>
        <div className="relative bg-gradient-to-r from-purple-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div className="text-center">
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900">
                Handmade Jewelry
                <span className="text-purple-600"> & Custom Designs</span>
              </h1>
              <p className="mt-6 sm:mt-8 text-lg sm:text-xl leading-7 sm:leading-8 text-gray-600 max-w-3xl mx-auto px-4">
                Discover beautiful handmade jewelry crafted with care. Personalize
                your pieces or choose from our curated collection. Free shipping on
                orders over $100.
              </p>
              <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6 px-4">
                <Link
                  href="/products"
                  className="w-full sm:w-auto btn-primary text-base sm:text-lg px-6 sm:px-8 py-3"
                >
                  Shop Collection
                </Link>
                <Link
                  href="/custom"
                  className="w-full sm:w-auto text-base sm:text-lg font-semibold leading-7 text-gray-900 hover:text-purple-600 transition-colors text-center"
                >
                  Custom Orders <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Products Section - Responsive Grid */}
        <div className="py-12 sm:py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
                Featured Products
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
                Discover our handpicked selection of premium jewelry
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              {featuredProducts.slice(0, 6).map((product: any) => (
                <div key={product._id} className="card card-hover group">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <Image
                      src={product.images[0] || '/placeholder-image.jpg'}
                      alt={product.name}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                        <Link href={`/products/${product._id}`} className="hover:text-purple-600 transition-colors">
                          {product.name}
                        </Link>
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">{product.category}</p>
                      {product.rating > 0 && (
                        <div className="flex items-center mt-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'
                                  }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-1 text-xs sm:text-sm text-gray-500">({product.reviews})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {product.salePrice ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">${product.price}</span>
                            <span className="text-lg sm:text-xl font-bold text-red-600">${product.salePrice}</span>
                          </>
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-gray-900">${product.price}</span>
                        )}
                      </div>
                      <Link
                        href={`/products/${product._id}`}
                        className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {featuredProducts.length === 0 && (
              <div className="text-center">
                <p className="text-gray-500">No featured products available at the moment.</p>
              </div>
            )}

            <div className="text-center mt-8 sm:mt-12">
              <Link href="/products" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3">
                View All Products
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 sm:py-16 lg:py-24 bg-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full bg-purple-600">
                  <span className="text-white font-bold text-lg sm:text-xl">✨</span>
                </div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">
                  Handcrafted
                </h3>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Each piece is carefully handmade with attention to detail
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full bg-purple-600">
                  <span className="text-white font-bold text-lg sm:text-xl">🎨</span>
                </div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">
                  Customizable
                </h3>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Personalize your jewelry with names, dates, or special messages
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full bg-purple-600">
                  <span className="text-white font-bold text-lg sm:text-xl">🚚</span>
                </div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">
                  Free Shipping
                </h3>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Complimentary shipping on all orders over $100
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Jewelry Store</h2>
            <p className="mt-3 sm:mt-4 text-gray-400 text-sm sm:text-base">
              Handmade jewelry with love and care
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
