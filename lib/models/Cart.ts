import mongoose from 'mongoose'

const CartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed to allow strings for custom items
    required: true,
  },
  unitId: {
    type: String,
    required: false, // Make optional for legacy products
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  effectivePrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  images: [{ type: String }],
  unitImages: [{ type: String }], // Add unit-specific images
  category: { type: String, required: true },
  size: { type: String },
  color: { type: String },
  availableStock: { type: Number, default: 0 },
  weight: { type: Number },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number }
  },
  // Add tax-related fields
  taxPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithTax: {
    type: Number,
    min: 0
  },
  // Add fields specific to custom items
  customDetails: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Only present for custom items
  }
}, { _id: false })

const CartSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [CartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Update the updatedAt field before saving
CartSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

// Add method to calculate cart total with tax
CartSchema.methods.calculateTotalWithTax = function () {
  return this.items.reduce((total, item) => {
    const itemTotal = item.effectivePrice * item.quantity;
    const taxAmount = itemTotal * (item.taxPercentage || 0) / 100;
    return total + itemTotal + taxAmount;
  }, 0);
};

// Add method to calculate total tax for cart
CartSchema.methods.calculateTotalTax = function () {
  return this.items.reduce((total, item) => {
    const itemTotal = item.effectivePrice * item.quantity;
    const taxAmount = itemTotal * (item.taxPercentage || 0) / 100;
    return total + taxAmount;
  }, 0);
};

// Create the model
const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema)

export default Cart
