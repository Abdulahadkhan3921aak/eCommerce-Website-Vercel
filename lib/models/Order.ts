import mongoose, { Schema, Document } from 'mongoose'

export interface IOrder extends Document {
  orderNumber: string
  userId: string
  items: Array<{
    productId: string
    unitId?: string
    name: string
    price: number
    quantity: number
    size?: string
    color?: string
    image?: string
  }>
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  status: string
  paymentStatus: string
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
    phone?: string
    email?: string
    residential?: boolean
  }
  billingAddress?: {
    name?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
    phone?: string
    email?: string
  }
  customerEmail: string
  customerPhone?: string
  stripeSessionId?: string
  stripePaymentIntentId?: string
  shippingMethod?: string
  trackingNumber?: string
  shippoShipment?: {
    rateId?: string
    carrier?: string
    serviceLevelToken?: string
    serviceLevelName?: string
    cost?: number
    estimatedDeliveryDays?: number
    shipmentId?: string
    transactionId?: string
    trackingNumber?: string
    labelUrl?: string
  }
  adminApproval?: {
    isApproved?: boolean
    approvedBy?: string
    approvedAt?: Date
    rejectedBy?: string
    rejectedAt?: Date
    rejectionReason?: string
    adminNotes?: string
  }
  emailHistory: Array<{
    sentBy: string
    type: string
    subject: string
    content: string
    sentAt?: Date
  }>
  shippingWeight?: number
  shippingDimensions?: {
    length: number
    width: number
    height: number
    unit?: 'in' | 'cm' // Add unit tracking
  }
  shippingWeightUnit?: 'lb' | 'kg' // Add weight unit tracking
  isPriceAdjusted?: boolean
  originalOrderId?: string
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true // Remove the separate index: true to avoid duplicate
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    unitId: String,
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: String,
    color: String,
    image: String
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCost: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'pending_payment_adjustment'],
    default: 'pending_approval'
  },
  paymentStatus: {
    type: String,
    enum: ['pending_approval', 'captured', 'failed', 'cancelled', 'pending_adjustment'],
    default: 'pending_approval'
  },
  shippingAddress: {
    name: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postal_code: { type: String, required: true },
    country: { type: String, required: true },
    phone: String,
    email: String,
    residential: Boolean
  },
  billingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,
    phone: String,
    email: String
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: String,
  stripeSessionId: String,
  stripePaymentIntentId: String,
  shippingMethod: String,
  trackingNumber: String,
  shippoShipment: {
    rateId: String,
    carrier: String,
    serviceLevelToken: String,
    serviceLevelName: String,
    cost: Number,
    estimatedDeliveryDays: Number,
    shipmentId: String,
    transactionId: String,
    trackingNumber: String,
    labelUrl: String
  },
  adminApproval: {
    isApproved: Boolean,
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    adminNotes: String
  },
  emailHistory: [{
    sentBy: { type: String, required: true },
    type: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    sentAt: { type: Date, default: Date.now }
  }],
  shippingWeight: Number,
  shippingDimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['in', 'cm'],
      default: 'in'
    }
  },
  shippingWeightUnit: {
    type: String,
    enum: ['lb', 'kg'],
    default: 'lb'
  },
  isPriceAdjusted: Boolean,
  originalOrderId: String
}, {
  timestamps: true
})

// Remove any duplicate index definitions
// OrderSchema.index({ orderNumber: 1 }) // This should be removed if unique: true is set above

// Pre-save hook to generate order number
OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    try {
      // Use this.constructor instead of mongoose.model('Order') to avoid circular reference
      const count = await (this.constructor as any).countDocuments()
      this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating order number:', error)
      // Fallback order number generation
      this.orderNumber = `ORD-${Date.now()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`
    }
  }
  next()
})

const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order
