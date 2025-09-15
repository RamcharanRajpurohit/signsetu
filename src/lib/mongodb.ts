import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = 'signsetu';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

export interface StudyBlock {
  _id?: string;
  userId: string;
  blockId: string;
  startTime: Date;
  endTime: Date;
  reminderSent: boolean;
  createdAt: Date;
}

export { db };