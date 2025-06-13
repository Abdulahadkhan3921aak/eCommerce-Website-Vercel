import mongoose from 'mongoose';
import { ProductCategory, ProductUnit, ProductSaleConfig } from '@/lib/types/product';

const ProductUnitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  images: [{
    type: String
  }],
  saleConfig: {
    isOnSale: {
      type: Boolean,
      default: false
    },
    saleType: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage'
    },
    saleValue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  sku: String
}, { _id: true });

const ProductSaleConfigSchema = new mongoose.Schema({
  isOnSale: {
    type: Boolean,
    default: false
  },
  saleType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'percentage'
  },
  saleValue: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['ring', 'earring', 'bracelet', 'necklace']
  },
  colors: [{
    type: String,
    required: true
  }],
  sizes: [{
    type: String,
    required: true
  }],
  units: {
    type: [ProductUnitSchema],
    validate: {
      validator: function (units: any[]) {
        return units && units.length > 0;
      },
      message: 'At least one product unit is required'
    }
  },
  saleConfig: ProductSaleConfigSchema,
  tax: {
    type: Number,
    default: 0,
    min: 0,
    max: 100, // Maximum 100% tax
    validate: {
      validator: function (v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Tax percentage must be between 0 and 100'
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  // Legacy fields for backward compatibility (not required)
  price: {
    type: Number,
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  images: [{
    type: String
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    min: 0,
    default: 0
  },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
}, {
  timestamps: true
});

// Auto-generate slug from name
ProductSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Virtual for total stock
ProductSchema.virtual('totalStock').get(function () {
  if (!this.units || this.units.length === 0) return 0;
  return this.units.reduce((total, unit) => total + (unit.stock || 0), 0);
});

// Virtual for display price (from first unit)
ProductSchema.virtual('displayPrice').get(function () {
  if (!this.units || this.units.length === 0) return 0;
  return this.units[0].price;
});

// Virtual for display image (from first unit)
ProductSchema.virtual('displayImage').get(function () {
  if (!this.units || this.units.length === 0) return '/images/placeholder.jpg';
  if (this.units[0].images && this.units[0].images.length > 0) {
    return this.units[0].images[0];
  }
  return '/images/placeholder.jpg';
});

// Virtual for calculating unit price with tax
ProductSchema.virtual('displayPriceWithTax').get(function () {
  if (!this.units || this.units.length === 0) return 0;
  const basePrice = this.units[0].price;
  const taxAmount = basePrice * (this.tax || 0) / 100;
  return basePrice + taxAmount;
});

// Method to calculate tax for a specific unit price
ProductSchema.methods.calculateTaxForPrice = function (price: number): number {
  return price * (this.tax || 0) / 100;
};

// Method to calculate total price with tax for a unit
ProductSchema.methods.getTotalPriceWithTax = function (price: number): number {
  return price + this.calculateTaxForPrice(price);
};

// Ensure virtual fields are included in JSON output
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

// Create and export the model
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export default Product;

export interface Product extends mongoose.Document {
  _id: string
  name: string
  description: string
  category: ProductCategory
  colors: string[]
  sizes: string[]
  units: ProductUnit[]
  saleConfig: ProductSaleConfig
  tax?: number // Tax percentage (0-100)
  featured?: boolean
  slug?: string
  totalStock: number
  displayPrice: number
  displayImage: string
  displayPriceWithTax: number
  calculateTaxForPrice(price: number): number
  getTotalPriceWithTax(price: number): number
  createdAt: Date
  updatedAt: Date
}
