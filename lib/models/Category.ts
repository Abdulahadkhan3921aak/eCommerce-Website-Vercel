import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: 'ring' | 'earring' | 'bracelet' | 'necklace' // Only singular forms
  slug: string
  description?: string
  image?: string
  featured?: boolean
  sortOrder?: number
}

const CategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: {
      values: ['ring', 'earring', 'bracelet', 'necklace'],
      message: 'Category name must be one of: ring, earring, bracelet, necklace (singular forms only)'
    },
    lowercase: true,
    trim: true
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

// Pre-save middleware to ensure slug matches name
CategorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
  }
  next()
});

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
