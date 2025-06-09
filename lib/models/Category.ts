import mongoose, { Document, Schema } from 'mongoose';

export interface Category extends Document {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  createdAt?: Date
  updatedAt?: Date
}

const CategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
  },
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to generate slug from name if not provided
CategorySchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  next();
});

export default mongoose.models.Category || mongoose.model<Category>('Category', CategorySchema);
