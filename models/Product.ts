import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  inStock: boolean;
  customizable: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0,
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['necklaces', 'bracelets', 'rings', 'earrings', 'custom'],
  },
  images: [{
    type: String,
    required: true,
  }],
  inStock: {
    type: Boolean,
    default: true,
  },
  customizable: {
    type: Boolean,
    default: false,
  },
  tags: [String],
}, {
  timestamps: true,
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
