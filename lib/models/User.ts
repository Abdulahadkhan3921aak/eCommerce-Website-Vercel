import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['customer', 'admin', 'owner'],
    default: 'customer',
  },
  permissions: {
    canManageProducts: { type: Boolean, default: false },
    canManageOrders: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canManageRoles: { type: Boolean, default: false }, // Only owner and high-level admins
  },
  createdBy: {
    type: String, // clerkId of who created/promoted this user
    default: null,
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  }],
}, {
  timestamps: true,
})

export default mongoose.models.User || mongoose.model('User', UserSchema)
