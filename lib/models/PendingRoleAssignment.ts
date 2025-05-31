import mongoose from 'mongoose'

const PendingRoleAssignmentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  assignedRole: {
    type: String,
    enum: ['customer', 'admin', 'owner'],
    required: true,
  },
  assignedBy: {
    type: String, // clerkId of the admin who assigned the role
    required: true,
  },
  assignedByEmail: {
    type: String,
    required: true,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  processedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
})

// Prevent duplicate pending assignments for same email
PendingRoleAssignmentSchema.index({ email: 1 }, { unique: true })

export default mongoose.models.PendingRoleAssignment || mongoose.model('PendingRoleAssignment', PendingRoleAssignmentSchema)
