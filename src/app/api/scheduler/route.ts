import { NextRequest } from 'next/server';
import { startScheduler, stopScheduler, getSchedulerStatus } from '@/lib/scheduler';

console.log('🎛️ Scheduler API route loaded');

export async function GET(request: NextRequest) {
  console.log('📊 GET /api/scheduler - Status check');
  
  try {
    const status = getSchedulerStatus();
    
    return Response.json({
      status: 'success',
      scheduler: status,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('❌ Error getting scheduler status:', error);
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔄 POST /api/scheduler - Control scheduler');
  
  try {
    const body = await request.json();
    const { action } = body;
    
    console.log('- Action:', action);
    
    if (!action || !['start', 'stop'].includes(action)) {
      return Response.json({
        status: 'error',
        error: 'Invalid action. Use "start" or "stop"',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    if (action === 'start') {
      console.log('🚀 Starting scheduler...');
      startScheduler();
      
      return Response.json({
        status: 'success',
        message: 'Scheduler started successfully',
        scheduler: getSchedulerStatus(),
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'stop') {
      console.log('🛑 Stopping scheduler...');
      stopScheduler();
      
      return Response.json({
        status: 'success',
        message: 'Scheduler stopped successfully',
        scheduler: getSchedulerStatus(),
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error controlling scheduler:', error);
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}