import { connectToDatabase, StudyBlock } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function createStudyBlock(blockData: Omit<StudyBlock, '_id' | 'blockId' | 'reminderSent' | 'createdAt'>): Promise<StudyBlock | null> {
  try {
    const db = await connectToDatabase();
    
    const newBlock: StudyBlock = {
      ...blockData,
      blockId: new ObjectId().toString(),
      reminderSent: false,
      createdAt: new Date(),
    };

    const result = await db.collection<StudyBlock>('study_blocks').insertOne(newBlock);
    
    if (result.acknowledged) {
      return { ...newBlock, _id: result.insertedId.toString() };
    }
    return null;
  } catch (error) {
    console.error('Error creating study block:', error);
    return null;
  }
}

export async function getUserStudyBlocks(userId: string): Promise<StudyBlock[]> {
  try {
    const db = await connectToDatabase();
    
    const blocks = await db.collection<StudyBlock>('study_blocks')
      .find({ userId })
      .sort({ startTime: 1 })
      .toArray();
    
    return blocks.map(block => ({
      ...block,
      _id: block._id?.toString()
    }));
  } catch (error) {
    console.error('Error fetching user study blocks:', error);
    return [];
  }
}

export async function deleteStudyBlock(blockId: string, userId: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    
    const result = await db.collection<StudyBlock>('study_blocks').deleteOne({
      blockId,
      userId
    });
    
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting study block:', error);
    return false;
  }
}

export async function getUpcomingBlocks(minutes: number = 10): Promise<StudyBlock[]> {
  try {
    const db = await connectToDatabase();
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
    
    const blocks = await db.collection<StudyBlock>('study_blocks')
      .find({
        startTime: { $gte: now, $lte: futureTime },
        reminderSent: false
      })
      .toArray();
    
    return blocks.map(block => ({
      ...block,
      _id: block._id?.toString()
    }));
  } catch (error) {
    console.error('Error fetching upcoming blocks:', error);
    return [];
  }
}

export async function markReminderSent(blockId: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    
    const result = await db.collection<StudyBlock>('study_blocks').updateOne(
      { blockId },
      { $set: { reminderSent: true } }
    );
    
    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    return false;
  }
}