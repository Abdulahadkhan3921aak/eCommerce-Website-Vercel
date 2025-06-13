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
    isCustom?: boolean // Add custom item indicator
    customDetails?: {
      category: string
      engraving?: string
      notes?: string
    }
    // Add tax-related fields for items
    taxPercentage?: number
    taxAmount?: number
    totalWithTax?: number
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
  paymentToken?: string // New field for payment token
  paymentTokenExpiry?: Date // New field for payment token expiry
  isTaxSet?: boolean // New field to track if tax has been explicitly set by admin
  isCustomOrder?: boolean // Add custom order flag
  customOrderDetails?: {
    category: string
    title: string
    description?: string
    sizes: string
    engraving?: string
    notes?: string
  }
}

const generateOrderNumber = () => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${timestamp.slice(-6)}-${random}`
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: generateOrderNumber
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
    image: String,
    isCustom: Boolean, // Add custom item flag
    customDetails: {
      category: String,
      engraving: String,
      notes: String
    },
    // Add tax-related fields for items
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
      required: true,
      min: 0
    }
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
  status: { // Updated enum
    type: String,
    enum: ['pending_approval', 'accepted', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'pending_payment_adjustment', 'pending_payment', 'removed'],
    default: 'pending_approval'
  },
  paymentStatus: { // Updated enum
    type: String,
    enum: ['pending_approval', 'pending_payment', 'captured', 'failed', 'cancelled', 'pending_adjustment', 'succeeded', 'refunded'],
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
  originalOrderId: String,
  paymentToken: {
    type: String,
    sparse: true
  },
  paymentTokenExpiry: {
    type: Date,
    sparse: true
  },
  isTaxSet: Boolean,
  isCustomOrder: {
    type: Boolean,
    default: false
  },
  customOrderDetails: {
    category: String,
    title: String,
    description: String,
    sizes: String,
    engraving: String,
    notes: String,
    images: [String]
  }
}, {
  timestamps: true
})

// Ensure unique order numbers with retry logic
OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    let orderNumber
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      orderNumber = generateOrderNumber()
      const existingOrder = await this.constructor.findOne({ orderNumber })

      if (!existingOrder) {
        this.orderNumber = orderNumber
        break
      }

      attempts++
      if (attempts >= maxAttempts) {
        return next(new Error('Unable to generate unique order number'))
      }
    }
  }
  next()
})

// Add method to calculate total tax amount
OrderSchema.methods.calculateTotalTax = function () {
  return this.items.reduce((total, item) => total + (item.taxAmount || 0), 0);
};

// Add method to calculate total with all taxes
OrderSchema.methods.calculateGrandTotal = function () {
  return this.subtotal + this.shippingCost + this.tax;
};

// Create and export the model
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;
