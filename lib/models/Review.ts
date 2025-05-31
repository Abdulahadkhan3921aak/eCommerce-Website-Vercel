import mongoose from 'mongoose'

const ReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false, // Set to true if user actually purchased the product
  },
}, {
  timestamps: true,
})

// Prevent duplicate reviews from same user for same product
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true })

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema)
