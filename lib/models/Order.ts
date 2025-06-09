import mongoose, { Document, Schema, Model } from 'mongoose'

interface ShippoShipmentDetails {
  rateId?: string; // Shippo rate object_id
  carrier?: string; // e.g., "USPS", "FedEx"
  serviceLevelToken?: string; // e.g., "usps_priority"
  serviceLevelName?: string; // e.g., "USPS Priority Mail"
  cost?: number; // The actual cost of the shipping label
  estimatedDeliveryDays?: number;
  trackingNumber?: string;
  labelUrl?: string;
  transactionId?: string; // Shippo transaction object_id
}

export interface IOrder extends Document {
  userId: string;
  orderNumber?: string;
  items: Array<{
    productId: mongoose.Schema.Types.ObjectId;
    unitId: string;
    name?: string;
    price?: number;
    quantity?: number;
    size?: string;
    color?: string;
    image?: string;
  }>;
  subtotal: number;
  shippingCost?: number;
  tax?: number;
  total: number;
  status?: 'pending_approval' | 'approved' | 'rejected' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'pending_payment_adjustment';
  paymentStatus?: 'pending_approval' | 'approved' | 'captured' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'pending_adjustment';
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string; // Should default to 'US' or be validated
    phone?: string;
    email?: string;
    residential?: boolean;
  };
  billingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
    email?: string;
  };
  shippingMethod: string;
  customerEmail?: string;
  customerPhone?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentMethod?: string; // e.g., 'stripe_card', 'stripe_apple_pay', 'stripe_google_pay'
  adminApproval?: {
    isApproved: boolean;
    approvedBy?: string; // Clerk User ID
    approvedAt?: Date;
    rejectedBy?: string; // Clerk User ID
    rejectedAt?: Date;
    rejectionReason?: string;
    adminNotes?: string; // Added admin notes
  };
  emailHistory: Array<{
    sentAt: Date;
    sentBy: string; // User ID or 'system'
    type: 'confirmation' | 'approval' | 'rejection' | 'shipping_update' | 'custom';
    subject: string;
    contentPreview?: string; // Optional: a snippet or summary
    content: string; // Can be HTML or plain text
  }>;
  shippoShipment?: ShippoShipmentDetails;
  shippingWeight?: number; // in a consistent unit, e.g., kg or lbs
  shippingDimensions?: { // in a consistent unit, e.g., cm or inches
    length: number;
    width: number;
    height: number;
  };
  isPriceAdjusted?: boolean; // True if admin updated shipping causing price change
  originalOrderId?: string; // Link to original order if this is an adjusted version
}

const OrderSchema: Schema<IOrder> = new Schema({
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
    unitId: { // Track specific unit for inventory deduction
      type: String,
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
    enum: ['pending_approval', 'approved', 'rejected', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'pending_payment_adjustment'],
    default: 'pending_approval',
  },
  paymentStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'captured', 'paid', 'failed', 'refunded', 'cancelled', 'pending_adjustment'],
    default: 'pending_approval',
  },
  shippingAddress: {
    name: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postal_code: { type: String, required: true },
    country: { type: String, required: true, default: 'US' }, // Default to US
    phone: { type: String },
    email: { type: String },
    residential: { type: Boolean },
  },
  billingAddress: {
    name: { type: String },
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
    phone: { type: String },
    email: { type: String },
  },
  shippingMethod: { type: String, default: 'standard' },
  customerEmail: { type: String },
  customerPhone: { type: String },
  stripeSessionId: { type: String },
  stripePaymentIntentId: { type: String },
  paymentMethod: { type: String },
  adminApproval: {
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    rejectedBy: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String }, // Added admin notes
  },
  emailHistory: [{
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: String, required: true },
    type: { type: String, enum: ['confirmation', 'approval', 'rejection', 'shipping_update', 'custom'], required: true },
    subject: { type: String, required: true },
    contentPreview: { type: String },
    content: { type: String, required: true },
  }],
  shippoShipment: {
    rateId: String,
    carrier: String,
    serviceLevelToken: String,
    serviceLevelName: String,
    cost: Number,
    estimatedDeliveryDays: Number,
    trackingNumber: String,
    labelUrl: String,
    transactionId: String,
  },
  shippingWeight: { type: Number },
  shippingDimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  isPriceAdjusted: { type: Boolean, default: false },
  originalOrderId: { type: String, ref: 'Order' }, // Optional: Link to another Order
}, {
  timestamps: true,
})

// Generate order number before saving
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments()
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})

export default (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema)
