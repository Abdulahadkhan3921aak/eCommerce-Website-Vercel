# Butterflies Beading - eCommerce Website

A modern, full-featured eCommerce website built with Next.js for Butterflies Beading, specializing in handmade jewelry and custom designs.

## 🌟 Features

### Core Functionality

- **Product Catalog**: Browse and search through handcrafted jewelry collections
- **Featured Products**: Showcase highlighted items on the homepage
- **Product Details**: Detailed product pages with images, pricing, and specifications
- **Shopping Cart**: Add, remove, and manage items with real-time notifications
- **Custom Orders**: Personalized jewelry design requests with detailed specifications
- **User Authentication**: Secure login and registration with Clerk
- **Address Management**: Save and validate shipping addresses with Shippo integration

### eCommerce Features

- **Multiple Product Variants**: Support for different sizes, colors, and options (units system)
- **Dynamic Pricing**: Sale prices, bulk discounts, and varied pricing per variant
- **Order Management**: Complete order processing workflow with admin approval system
- **Shipping Integration**: Shippo API for address validation and shipping calculations
- **Inventory Management**: Stock tracking and availability status
- **Direct Order Processing**: Manual order review and approval system for personalized service

### Order Processing Workflow

1. **Cart Management**: Users add items and provide shipping address
2. **Address Validation**: Real-time address validation using Shippo API
3. **Order Placement**: Direct order creation without immediate payment
4. **Admin Review**: Orders require admin approval and pricing confirmation
5. **Customer Notification**: Email updates throughout the process
6. **Payment Processing**: Secure payment collection after order approval

### Custom Order System

- **Visual Size Selection**: Interactive SVG-based size selectors for different jewelry types
- **Personalization Options**: Engraving and custom text capabilities
- **Multiple Size Orders**: Support for ordering multiple sizes of the same item
- **Detailed Specifications**: Custom notes and material preferences
- **Quote-Based Pricing**: Personalized pricing after design review

### Technical Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS v4
- **SEO Optimized**: Structured data, meta tags, and Open Graph support
- **Performance**: Next.js 15 with Turbopack for fast development
- **Database**: MongoDB with Mongoose for data persistence
- **Email Notifications**: Nodemailer integration for order confirmations
- **Image Optimization**: Sharp for image processing and optimization
- **Type Safety**: Full TypeScript implementation
- **Address Validation**: Shippo integration for US address verification

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
- **Authentication**: Clerk for user management and metadata storage
- **Shipping**: Shippo API for address validation and rate calculation
- **Email**: Nodemailer for transactional emails
- **Order Processing**: Custom workflow with admin approval system

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
- Shippo account for shipping (optional but recommended)

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

   # Shipping (Shippo) - Optional but recommended
   SHIPPO_API_KEY=your_shippo_api_key
   SHIPPO_SENDER_NAME="Butterflies Beading"
   SHIPPO_SENDER_STREET1="Your Business Address"
   SHIPPO_SENDER_CITY="Your City"
   SHIPPO_SENDER_STATE="Your State"
   SHIPPO_SENDER_ZIP="Your ZIP Code"
   SHIPPO_SENDER_COUNTRY="US"
   SHIPPO_SENDER_PHONE="Your Phone Number"
   SHIPPO_SENDER_EMAIL="Your Email"

   # Email Configuration
   EMAIL_HOST=your_smtp_host
   EMAIL_PORT=587
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password

   # Business Configuration
   FREE_SHIPPING_THRESHOLD=100

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
│   │   ├── orders/        # Order management endpoints
│   │   ├── shipping/      # Shipping and address validation
│   │   └── user/          # User management
│   ├── products/          # Product pages
│   ├── cart/              # Shopping cart page
│   ├── custom/            # Custom order page
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── Header.tsx         # Navigation header
│   ├── ui/               # UI components
│   └── SEO/              # SEO components
├── lib/                   # Utility functions and configurations
│   ├── contexts/         # React contexts (Cart, etc.)
│   ├── models/           # MongoDB/Mongoose models
│   ├── services/         # External API services (Shippo)
│   └── utils/            # Helper functions
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 🎯 Business Focus

**Butterflies Beading** specializes in:

- Handcrafted jewelry with attention to detail
- Custom and personalized designs
- Premium materials and craftsmanship
- Personal customer service with order review process
- US shipping with validated addresses
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

## 🛍️ Order Processing Flow

### Regular Products

1. Customer adds items to cart
2. Customer provides shipping address (validated via Shippo)
3. Customer places order (no immediate payment)
4. Admin reviews order and confirms pricing/availability
5. Customer receives email with payment instructions
6. Payment processed after confirmation
7. Order fulfillment and shipping

### Custom Orders

1. Customer designs custom jewelry with specifications
2. Detailed form submission with preferences
3. Admin reviews and provides custom quote
4. Customer approves quote and makes payment
5. Custom jewelry creation (2-4 weeks)
6. Quality assurance and shipping

## 🚚 Shipping Features

- **US Only**: Currently limited to US shipping addresses
- **Address Validation**: Real-time validation using Shippo API
- **No PO Boxes**: Street addresses required for shipping
- **Free Shipping**: Available on orders over $100
- **Rate Calculation**: Dynamic shipping cost calculation
- **Multiple Carriers**: Support for USPS, FedEx, UPS via Shippo

## 🔒 Security Features

- **Clerk Authentication**: Secure user management
- **Address Validation**: Prevent invalid shipping addresses
- **Order Verification**: Admin approval process for all orders
- **Secure Data Storage**: Encrypted user information in Clerk
- **HTTPS Only**: Secure communication in production

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
