import Link from 'next/link'

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-6">Welcome to Our Store</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Discover amazing products at unbeatable prices. Quality guaranteed!
        </p>
        <div className="space-x-4">
          <Link href="/products" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Shop Now
          </Link>
          <Link href="/categories" className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
            Browse Categories
          </Link>
        </div>
      </div>
    </section>
  )
}
