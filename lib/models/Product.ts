import mongoose, { Document, Schema } from 'mongoose';

// Import the client-side types
import type { Product as ProductType, ProductUnit as ProductUnitType } from '@/lib/types/product';

// Server-side interfaces that extend Document for Mongoose
export interface ProductUnit extends ProductUnitType { }

export interface Product extends ProductType, Document { }

const ProductUnitSchema: Schema = new Schema({
  unitId: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    required: false,
  },
  color: {
    type: String,
    required: false,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: 0,
  },
  salePrice: {
    type: Number,
    required: false,
  },
  images: {
    type: [String],
    required: false,
    default: [],
  },
  saleConfig: {
    isOnSale: {
      type: Boolean,
      default: false,
    },
    saleType: {
      type: String,
      enum: ['percentage', 'amount'],
      required: false,
    },
    saleValue: {
      type: Number,
      required: false,
      min: 0,
      validate: {
        validator: function (this: any, value: number) {
          if (this.saleConfig?.isOnSale && this.saleConfig?.saleType) {
            if (this.saleConfig.saleType === 'percentage') {
              return value <= 100;
            }
            return value < this.price;
          }
          return true;
        },
        message: 'Sale value must be valid for the sale type'
      }
    },
  },
  sku: {
    type: String,
    required: false,
  },
}, { _id: false });

const VALID_CATEGORIES = ['ring', 'earring', 'bracelet', 'necklace'] as const;

const ProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
  },
  images: [{
    type: String,
    required: true,
  }],
  category: {
    type: String,
    required: true,
    enum: {
      values: VALID_CATEGORIES,
      message: 'Category must be one of: ring, earring, bracelet, necklace (singular forms only)'
    },
    lowercase: true,
    trim: true
  },
  sizes: [String],
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0,
  },
  salePrice: {
    type: Number,
    required: false,
  },
  saleConfig: {
    isOnSale: {
      type: Boolean,
      default: false,
    },
    saleType: {
      type: String,
      enum: ['percentage', 'amount'],
      required: false,
    },
    saleValue: {
      type: Number,
      required: false,
      min: 0,
      validate: {
        validator: function (this: any, value: number) {
          if (this.saleConfig?.isOnSale && this.saleConfig?.saleType) {
            if (this.saleConfig.saleType === 'percentage') {
              return value <= 100;
            }
            return value < this.price;
          }
          return true;
        },
        message: 'Sale value must be valid for the sale type'
      }
    },
  },
  colors: [String],

  totalStock: {
    type: Number,
    default: function () {
      // Calculate total stock from units if they exist
      if (this.units && this.units.length > 0) {
        return this.units.reduce((sum, unit) => sum + (unit.stock || 0), 0);
      }
      return this.stock || 0; // Fallback to legacy stock field
    },
  },
  units: [ProductUnitSchema],
  featured: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  customization: {
    type: Schema.Types.Mixed,
    required: false,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to calculate total stock
ProductSchema.pre('save', function (next) {
  if (this.units && this.units.length > 0) {
    this.totalStock = this.units.reduce((total, unit) => total + (unit.stock || 0), 0);
  } else {
    this.totalStock = this.stock || 0;
  }
  next();
});

// Generate unique unit IDs before saving
ProductSchema.pre('save', function (next) {
  if (this.units && this.units.length > 0) {
    this.units.forEach(unit => {
      if (!unit.unitId) {
        unit.unitId = `${this._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    });
  }
  next();
});

// Add slug generation before saving
ProductSchema.pre('save', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to normalize category
ProductSchema.pre('save', function (next) {
  if (this.isModified('category')) {
    const category = this.category?.toLowerCase().trim();

    // Convert plural to singular if needed
    const pluralToSingular: Record<string, string> = {
      'rings': 'ring',
      'earrings': 'earring',
      'bracelets': 'bracelet',
      'necklaces': 'necklace'
    };

    if (category && pluralToSingular[category]) {
      this.category = pluralToSingular[category];
    }
  }
  next();
});

export default mongoose.models.Product || mongoose.model<Product>('Product', ProductSchema);
