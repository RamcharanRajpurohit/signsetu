import { MongoClient, Db } from 'mongodb';

console.log('🗄️ MongoDB lib initializing...');

const uri = process.env.MONGODB_URI!;
const dbName = 'signsetu';

console.log('📋 MongoDB environment check:');
console.log('- MONGODB_URI:', uri ? '✅ Present' : '❌ Missing');
console.log('- Database name:', dbName);

if (!uri) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  throw new Error('MONGODB_URI is required');
}

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  console.log('🔌 Connecting to MongoDB...');
  
  if (!client) {
    console.log('🆕 Creating new MongoDB client...');
    try {
      client = new MongoClient(uri);
      console.log('📞 Attempting to connect to MongoDB...');
      
      await client.connect();
      console.log('✅ MongoDB client connected successfully');
      
      db = client.db(dbName);
      console.log(`✅ Database "${dbName}" selected`);
      
      // Test the connection
      await db.admin().ping();
      console.log('🏓 Database ping successful');
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      console.error('- Error type:', typeof error);
      console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  } else {
    console.log('♻️ Reusing existing MongoDB connection');
  }
  
  return db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down MongoDB connection...');
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  process.exit(0);
});

export interface StudyBlock {
  _id?: string;
  userId: string;
  blockId: string;
  startTime: Date;
  endTime: Date;
  reminderSent: boolean;
  createdAt: Date;
}

console.log('✅ MongoDB lib initialization completed');