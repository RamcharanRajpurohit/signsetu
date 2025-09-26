import { NextRequest } from 'next/server';
import { getUpcomingBlocks, markReminderSent } from '@/services/blocks';
import { sendEmail, generateReminderEmail } from '@/services/email';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

console.log('🚀 Reminders API route loaded');

export async function POST(request: NextRequest) {
  console.log('📨 POST /api/reminders - Cron job triggered');
  console.log('- Timestamp:', new Date().toISOString());
  console.log('- Request method:', request.method);
  console.log('- Request URL:', request.url);

  const startTime = Date.now();

  try {
    console.log('🔐 Checking authorization...');
    
    // Verify cron secret for security
    const cronSecret = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
    
    console.log('- Authorization header:', cronSecret ? 'Present' : 'Missing');
    console.log('- Expected format: Bearer <secret>');
    console.log('- CRON_SECRET env:', process.env.CRON_SECRET ? 'Set' : 'Not set');
    
    if (!process.env.CRON_SECRET) {
      console.error('❌ CRON_SECRET environment variable is not set');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (cronSecret !== expectedSecret) {
      console.error('❌ Unauthorized access attempt');
      console.error('- Received:', cronSecret);
      console.error('- Expected format: Bearer <secret>');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Authorization successful');

    console.log('⏰ Fetching upcoming blocks (10 minutes)...');
    const upcomingBlocks = await getUpcomingBlocks(10);
    
    let remindersSent = 0;
    let errors: string[] = [];
    let successfulBlocks: string[] = [];

    console.log(`📊 Processing ${upcomingBlocks.length} upcoming blocks...`);

    if (upcomingBlocks.length === 0) {
      console.log('ℹ️ No upcoming blocks found');
      const response = {
        message: 'No upcoming blocks to process',
        remindersSent: 0,
        blocksProcessed: 0,
        executionTime: Date.now() - startTime
      };
      console.log('✅ Job completed:', response);
      return Response.json(response);
    }

    for (let i = 0; i < upcomingBlocks.length; i++) {
      const block = upcomingBlocks[i];
      console.log(`\n🔄 Processing block ${i + 1}/${upcomingBlocks.length}:`);
      console.log('- Block ID:', block.blockId);
      console.log('- User ID:', block.userId);
      console.log('- Start Time:', block.startTime.toISOString());
      console.log('- Minutes until start:', Math.round((block.startTime.getTime() - Date.now()) / (1000 * 60)));
      
      try {
        console.log('👤 Fetching user from Supabase...');
        
        // Get user email from Supabase
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(block.userId);
        
        console.log('- Supabase response:', {
          hasData: !!userData,
          hasUser: !!userData?.user,
          hasEmail: !!userData?.user?.email,
          errorPresent: !!userError
        });
        
        if (userError) {
          console.error('❌ Supabase error:', userError);
          errors.push(`Supabase error for block ${block.blockId}: ${userError.message}`);
          continue;
        }
        
        if (!userData?.user?.email) {
          console.error('❌ User not found or no email');
          console.error('- User data:', userData);
          errors.push(`User not found or no email for block ${block.blockId}`);
          continue;
        }
        
        const userEmail = userData.user.email;
        console.log('✅ User found:', userEmail);

        console.log('📧 Generating reminder email...');
        // Send reminder email
        const emailHtml = generateReminderEmail(block.startTime, block.endTime);
        
        console.log('📤 Sending email...');
        const emailSent = await sendEmail({
          to: userEmail,
          subject: '🔕 Study Block Starting Soon - 10 Minute Reminder',
          html: emailHtml,
        });

        if (emailSent) {
          console.log('✅ Email sent successfully');
          
          console.log('📝 Marking reminder as sent in database...');
          // Mark reminder as sent
          const marked = await markReminderSent(block.blockId);
          
          if (marked) {
            remindersSent++;
            successfulBlocks.push(block.blockId);
            console.log(`✅ Block ${block.blockId} processed successfully`);
            console.log('- Email sent: ✅');
            console.log('- Database updated: ✅');
          } else {
            console.error('❌ Failed to mark reminder as sent in database');
            errors.push(`Failed to mark reminder as sent for block ${block.blockId}`);
          }
        } else {
          console.error('❌ Failed to send email');
          errors.push(`Failed to send email for block ${block.blockId}`);
        }
        
      } catch (blockError) {
        console.error(`❌ Error processing block ${block.blockId}:`, blockError);
        console.error('- Error type:', typeof blockError);
        console.error('- Error message:', blockError instanceof Error ? blockError.message : 'Unknown error');
        console.error('- Stack trace:', blockError instanceof Error ? blockError.stack : 'No stack trace');
        errors.push(`Error processing block ${block.blockId}: ${blockError instanceof Error ? blockError.message : 'Unknown error'}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const response = {
      message: `Processed ${upcomingBlocks.length} blocks`,
      remindersSent,
      blocksProcessed: upcomingBlocks.length,
      successfulBlocks,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    };

    console.log('\n📊 Job Summary:');
    console.log('- Blocks found:', upcomingBlocks.length);
    console.log('- Reminders sent:', remindersSent);
    console.log('- Errors:', errors.length);
    console.log('- Execution time:', `${executionTime}ms`);
    console.log('- Success rate:', upcomingBlocks.length > 0 ? `${Math.round((remindersSent / upcomingBlocks.length) * 100)}%` : 'N/A');

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (successfulBlocks.length > 0) {
      console.log('\n✅ Successfully processed blocks:');
      successfulBlocks.forEach((blockId, index) => {
        console.log(`  ${index + 1}. ${blockId}`);
      });
    }

    console.log('\n🎉 Reminder cron job completed successfully');
    return Response.json(response);
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('\n💥 Fatal error in reminder cron job:');
    console.error('- Error type:', typeof error);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('- Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('- Execution time before error:', `${executionTime}ms`);
    
    const errorResponse = {
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`
    };
    
    return Response.json(errorResponse, { status: 500 });
  }
}

// GET method for health check / manual testing
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/reminders - Health check');
  
  const cronSecret = request.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const upcomingBlocks = await getUpcomingBlocks(10);
    
    return Response.json({
      status: 'healthy',
      message: 'Reminders service is operational',
      upcomingBlocks: upcomingBlocks.length,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return Response.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}