import { NextRequest } from 'next/server';
import { authenticateRequest, createAuthResponse } from '@/lib/auth';
import { deleteStudyBlock } from '@/services/blocks';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { blockId: string } }
) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return createAuthResponse('Unauthorized');
    }

    const { blockId } = params;
    
    const success = await deleteStudyBlock(blockId, user.id);
    
    if (!success) {
      return Response.json({ error: 'Block not found or could not be deleted' }, { status: 404 });
    }

    return Response.json({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/blocks/[blockId] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}