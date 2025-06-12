import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

let cached = global.mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'eCommerceDB',
    }

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      console.log('✅ Connected to MongoDB')

      await mongooseInstance.connection.asPromise();
      // Create indexes for better performance
      createIndexes()

      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    console.error('MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn
}

async function createIndexes() {
  try {
    const db = mongoose.connection.db

    if (!db) {
      console.warn('⚠️ No database connection available to create indexes.')
      return
    }

    // Products collection indexes
    await db.collection('products').createIndex({ name: 'text', description: 'text' })
    await db.collection('products').createIndex({ featured: 1, createdAt: -1 })
    await db.collection('products').createIndex({ price: 1 })
    await db.collection('products').createIndex({ 'units.price': 1 })

    // Handle category index with validation
    try {
      // Check if the basic category index exists without validation
      const indexes = await db.collection('products').indexes()
      const basicCategoryIndex = indexes.find(index =>
        index.name === 'category_1' && !index.partialFilterExpression
      )

      if (basicCategoryIndex) {
        console.log('ℹ️ Dropping basic category index to replace with validation index')
        await db.collection('products').dropIndex('category_1')
      }

      // Create the enhanced category index with validation
      await db.collection('products').createIndex({
        category: 1
      }, {
        partialFilterExpression: {
          category: { $in: ['ring', 'earring', 'bracelet', 'necklace'] }
        }
      })
      console.log('✅ Enhanced category validation index created successfully')

    } catch (indexError: any) {
      console.warn('⚠️ Could not create enhanced category index, falling back to basic index:', indexError.message)
      // Fallback to basic category index
      try {
        await db.collection('products').createIndex({ category: 1 })
        console.log('✅ Basic category index created as fallback')
      } catch (fallbackError) {
        console.warn('⚠️ Could not create basic category index:', fallbackError)
      }
    }

    console.log('✅ Database indexes created successfully')
  } catch (error) {
    console.warn('⚠️ Could not create indexes:', error)
    // Don't throw error - indexes are for performance, not functionality
  }
}


export default dbConnect  
