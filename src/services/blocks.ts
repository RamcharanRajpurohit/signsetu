import { connectToDatabase, StudyBlock } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

console.log('📦 Blocks service initialized');

export async function createStudyBlock(blockData: Omit<StudyBlock, '_id' | 'blockId' | 'reminderSent' | 'createdAt'>): Promise<StudyBlock | null> {
  console.log('➕ Creating new study block...');
  console.log('- Block data:', JSON.stringify({
    ...blockData,
    startTime: blockData.startTime.toISOString(),
    endTime: blockData.endTime.toISOString()
  }, null, 2));

  try {
    const db = await connectToDatabase();
    console.log('✅ Database connection established');
    
    const blockId = new ObjectId().toString();
    const now = new Date();
    
    const newBlock: StudyBlock = {
      ...blockData,
      blockId,
      reminderSent: false,
      createdAt: now,
    };

    console.log('📝 Creating block with:');
    console.log('- Block ID:', blockId);
    console.log('- User ID:', newBlock.userId);
    console.log('- Start Time (UTC):', newBlock.startTime.toISOString());
    console.log('- End Time (UTC):', newBlock.endTime.toISOString());
    console.log('- Created At:', now.toISOString());

    const result = await db.collection<StudyBlock>('study_blocks').insertOne(newBlock);
    
    if (result.acknowledged) {
      console.log('✅ Study block created successfully with _id:', result.insertedId.toString());
      return { ...newBlock, _id: result.insertedId.toString() };
    } else {
      console.error('❌ Database insert was not acknowledged');
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating study block:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function getUserStudyBlocks(userId: string): Promise<StudyBlock[]> {
  console.log('📋 Fetching user study blocks...');
  console.log('- User ID:', userId);

  try {
    const db = await connectToDatabase();
    console.log('✅ Database connection established');
    
    const blocks = await db.collection<StudyBlock>('study_blocks')
      .find({ userId })
      .sort({ startTime: 1 })
      .toArray();
    
    console.log(`✅ Found ${blocks.length} blocks for user ${userId}`);
    
    const processedBlocks = blocks.map(block => {
      const processed = {
        ...block,
        _id: block._id?.toString(),
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        createdAt: new Date(block.createdAt)
      };
      
      console.log('- Block:', {
        blockId: processed.blockId,
        startTime: processed.startTime.toISOString(),
        endTime: processed.endTime.toISOString(),
        reminderSent: processed.reminderSent
      });
      
      return processed;
    });
    
    return processedBlocks;
  } catch (error) {
    console.error('❌ Error fetching user study blocks:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export async function deleteStudyBlock(blockId: string, userId: string): Promise<boolean> {
  console.log('🗑️ Deleting study block...');
  console.log('- Block ID:', blockId);
  console.log('- User ID:', userId);

  try {
    const db = await connectToDatabase();
    console.log('✅ Database connection established');
    
    const result = await db.collection<StudyBlock>('study_blocks').deleteOne({
      blockId,
      userId
    });
    
    console.log('- Delete result:', { 
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged 
    });
    
    if (result.deletedCount === 1) {
      console.log('✅ Study block deleted successfully');
      return true;
    } else {
      console.log('⚠️ No block was deleted (block not found or user mismatch)');
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting study block:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

export async function getUpcomingBlocks(minutes: number = 10): Promise<StudyBlock[]> {
  console.log('⏰ Fetching upcoming blocks...');
  console.log('- Minutes ahead:', minutes);
  
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
  
  console.log('- Current time (UTC):', now.toISOString());
  console.log('- Future time (UTC):', futureTime.toISOString());
  console.log('- Current time (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('- Future time (IST):', futureTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

  try {
    const db = await connectToDatabase();
    console.log('✅ Database connection established');
    
    // Query using UTC dates since MongoDB stores dates in UTC
    const query = {
      startTime: { $gte: now, $lte: futureTime },
      reminderSent: false
    };
    
    console.log('📊 MongoDB query:');
    console.log('- Query:', JSON.stringify({
      startTime: { 
        $gte: now.toISOString(), 
        $lte: futureTime.toISOString() 
      },
      reminderSent: false
    }, null, 2));
    
    const blocks = await db.collection<StudyBlock>('study_blocks')
      .find(query)
      .toArray();
    
    console.log(`📊 Query results: Found ${blocks.length} upcoming blocks`);
    
    const processedBlocks = blocks.map((block, index) => {
      const processed = {
        ...block,
        _id: block._id?.toString(),
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        createdAt: new Date(block.createdAt)
      };
      
      console.log(`- Block ${index + 1}:`, {
        blockId: processed.blockId,
        userId: processed.userId,
        startTime_UTC: processed.startTime.toISOString(),
        startTime_IST: processed.startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        endTime_UTC: processed.endTime.toISOString(),
        endTime_IST: processed.endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        reminderSent: processed.reminderSent,
        minutesFromNow: Math.round((processed.startTime.getTime() - now.getTime()) / (1000 * 60))
      });
      
      return processed;
    });
    
    console.log('✅ Upcoming blocks processing completed');
    return processedBlocks;
  } catch (error) {
    console.error('❌ Error fetching upcoming blocks:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export async function markReminderSent(blockId: string): Promise<boolean> {
  console.log('✉️ Marking reminder as sent...');
  console.log('- Block ID:', blockId);

  try {
    const db = await connectToDatabase();
    console.log('✅ Database connection established');
    
    const result = await db.collection<StudyBlock>('study_blocks').updateOne(
      { blockId },
      { $set: { reminderSent: true } }
    );
    
    console.log('- Update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });
    
    if (result.modifiedCount === 1) {
      console.log('✅ Reminder marked as sent successfully');
      return true;
    } else if (result.matchedCount === 0) {
      console.log('⚠️ Block not found for marking reminder');
      return false;
    } else {
      console.log('⚠️ Block found but not modified (possibly already marked)');
      return false;
    }
  } catch (error) {
    console.error('❌ Error marking reminder as sent:', error);
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}