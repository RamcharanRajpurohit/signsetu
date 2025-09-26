import { NextRequest } from 'next/server';
import { authenticateRequest, createAuthResponse } from '@/lib/auth';
import { createStudyBlock, deleteStudyBlockAll, getUserStudyBlocks } from '@/services/blocks';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return createAuthResponse('Unauthorized');
    }

    const blocks = await getUserStudyBlocks(user.id);
    
    return Response.json({ blocks });
  } catch (error) {
    console.error('GET /api/blocks error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return createAuthResponse('Unauthorized');
    }

    const body = await request.json();
    const { startTime, endTime } = body;

    // Validate input
    if (!startTime || !endTime) {
      return Response.json({ error: 'Start time and end time are required' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return Response.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    if (start <= new Date()) {
      return Response.json({ error: 'Start time must be in the future' }, { status: 400 });
    }

    const block = await createStudyBlock({
      userId: user.id,
      startTime: start,
      endTime: end,
    });

    if (!block) {
      return Response.json({ error: 'Failed to create study block' }, { status: 500 });
    }

    return Response.json({ block }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blocks error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return createAuthResponse('Unauthorized');
      }
  
      
      const success = await deleteStudyBlockAll(user.id);
      
      if (!success) {
        return Response.json({ error: 'Block not found or could not be deleted' }, { status: 404 });
      }
  
      return Response.json({ message: 'Block deleted successfully' });
    } catch (error) {
      console.error('DELETE /api/blocks/ error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}