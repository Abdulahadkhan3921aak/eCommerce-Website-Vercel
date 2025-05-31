import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  salePrice: { // Calculated sale price
    type: Number,
    optional: true,
  },
  // New sale configuration fields
  saleConfig: {
    isOnSale: {
      type: Boolean,
      default: false,
    },
    saleType: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage',
    },
    saleValue: {
      type: Number,
      default: 0,
    },
  },
  images: [{
    type: String,
    required: true,
  }],
  category: {
    type: String,
    required: true,
  },
  sizes: [{
    type: String,
  }],
  colors: [{
    type: String,
  }],
  stock: {
    type: Number,
    default: 0,
  },
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
  slug: {
    type: String,
    required: true,
    unique: true,
  },
}, {
  timestamps: true,
})

// Pre-save middleware to calculate sale price
ProductSchema.pre('save', function(next) {
  if (this.saleConfig?.isOnSale && this.saleConfig?.saleValue > 0) {
    if (this.saleConfig.saleType === 'percentage') {
      this.salePrice = this.price * (1 - this.saleConfig.saleValue / 100);
    } else if (this.saleConfig.saleType === 'amount') {
      this.salePrice = Math.max(0, this.price - this.saleConfig.saleValue);
    }
  } else {
    this.salePrice = undefined;
  }
  next();
});

// Create index for better search performance
ProductSchema.index({ name: 'text', description: 'text' })

export default mongoose.models.Product || mongoose.model('Product', ProductSchema)
