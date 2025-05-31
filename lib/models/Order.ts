import mongoose from 'mongoose'

const OrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String,
    image: String,
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  shippingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,
  },
  billingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,
  },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  
  // UPS Shipping Integration
  upsShipment: {
    trackingNumber: String,
    shipmentId: String,
    labelUrl: String,
    estimatedDelivery: Date,
    serviceType: String,
    cost: Number,
  },
  
  // Customer info
  customerEmail: String,
  customerPhone: String,
  
  // Internal notes
  notes: String,
  adminNotes: String,
}, {
  timestamps: true,
})

// Generate order number before saving
OrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments()
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
