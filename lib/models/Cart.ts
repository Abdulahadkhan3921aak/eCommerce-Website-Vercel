import mongoose from 'mongoose'

const CartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
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

// Create the model
const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema)

export default Cart
