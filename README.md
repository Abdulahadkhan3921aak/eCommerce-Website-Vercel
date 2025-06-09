# Butterflies Beading - eCommerce Website

A modern, full-featured eCommerce website built with Next.js for Butterflies Beading, specializing in handmade jewelry and custom designs.

## 🌟 Features

### Core Functionality

- **Product Catalog**: Browse and search through handcrafted jewelry collections
- **Featured Products**: Showcase highlighted items on the homepage
- **Product Details**: Detailed product pages with images, pricing, and specifications
- **Shopping Cart**: Add, remove, and manage items with real-time notifications
- **Custom Orders**: Personalized jewelry design requests
- **User Authentication**: Secure login and registration with Clerk

### eCommerce Features

- **Multiple Product Variants**: Support for different sizes, colors, and options (units system)
- **Dynamic Pricing**: Sale prices, bulk discounts, and varied pricing per variant
- **Payment Processing**: Stripe integration for secure payments
- **Shipping Integration**: Shippo API for shipping calculations and labels
- **Inventory Management**: Stock tracking and availability status
- **Order Management**: Complete order processing workflow

### Technical Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **SEO Optimized**: Structured data, meta tags, and Open Graph support
- **Performance**: Next.js 15 with Turbopack for fast development
- **Database**: MongoDB with Mongoose for data persistence
- **Email Notifications**: Nodemailer integration for order confirmations
- **Image Optimization**: Sharp for image processing and optimization
- **Type Safety**: Full TypeScript implementation

## 🛠 Tech Stack

### Frontend

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with Lucide React icons
- **State Management**: React Context API for cart management
- **Image Handling**: Next.js Image component with Sharp optimization

### Backend

- **API**: Next.js API routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Clerk for user management
- **Payments**: Stripe for payment processing
- **Shipping**: Shippo API for logistics
- **Email**: Nodemailer for transactional emails

### Development Tools

- **Language**: TypeScript
- **Linting**: ESLint with Next.js configuration
- **Build Tool**: Next.js with Turbopack
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm or yarn
- MongoDB database
- Clerk account for authentication
- Stripe account for payments
- Shippo account for shipping (optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eCommerce-Website-Vercel
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```env
   # App Configuration
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Database
   MONGODB_URI=your_mongodb_connection_string

   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Payment Processing (Stripe)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key

   # Shipping (Shippo) - Optional
   SHIPPO_API_KEY=your_shippo_api_key

   # Email Configuration
   EMAIL_HOST=your_smtp_host
   EMAIL_PORT=587
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password

   # SEO
   GOOGLE_SITE_VERIFICATION=your_google_verification_code
   ```

4. **Run the development server**

   ```bash
   pnpm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API routes
│   ├── products/          # Product pages
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout process
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── Header.tsx         # Navigation header
│   ├── ui/               # UI components
│   └── SEO/              # SEO components
├── lib/                   # Utility functions and configurations
│   ├── contexts/         # React contexts
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 🎯 Business Focus

**Butterflies Beading** specializes in:

- Handcrafted jewelry with attention to detail
- Custom and personalized designs
- Premium materials and craftsmanship
- Free shipping on orders over $100
- Unique, artisan-made pieces

## 🔧 Available Scripts

- `pnpm run dev` - Start development server with Turbopack
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint for code quality

## 📦 Deployment

The project is optimized for deployment on Vercel:

1. **Connect your repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Environment Variables for Production

Make sure to set all the environment variables listed in the installation section in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is proprietary software for Butterflies Beading.

## 📞 Support

For support and inquiries, please contact the development team or visit the Butterflies Beading website.

---

**Built with ❤️ for handmade jewelry enthusiasts**
