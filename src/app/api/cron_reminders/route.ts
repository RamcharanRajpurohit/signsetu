import { NextRequest } from 'next/server';
import { getUpcomingBlocks, markReminderSent } from '@/services/blocks';
import { sendEmail, generateReminderEmail } from '@/services/email';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

console.log('🔄 Cron reminder endpoint loaded');

export async function GET(request: NextRequest) {
  const now = new Date();
  console.log(`\n⏰ [${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] External cron triggered...`);

  try {
    // Get upcoming blocks (next 10 minutes)
    const upcomingBlocks = await getUpcomingBlocks(10);
    
    if (upcomingBlocks.length === 0) {
      console.log('ℹ️ No upcoming blocks found');
      return Response.json({
        success: true,
        message: 'No upcoming blocks',
        timestamp: now.toISOString(),
        blocksFound: 0,
        remindersSent: 0
      });
    }

    console.log(`📊 Found ${upcomingBlocks.length} blocks needing reminders`);

    let remindersSent = 0;
    let errors: string[] = [];

    // Process each block
    for (const block of upcomingBlocks) {
      try {
        console.log(`📤 Processing block ${block.blockId}...`);
        
        // Get user email from Supabase
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(block.userId);
        
        if (userError || !userData?.user?.email) {
          const errorMsg = `User not found or no email for block ${block.blockId}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // Send reminder email
        const emailHtml = generateReminderEmail(block.startTime, block.endTime);
        const emailSent = await sendEmail({
          to: userData.user.email,
          subject: '🔕 Study Block Starting Soon - 10 Minute Reminder',
          html: emailHtml,
        });

        if (emailSent) {
          // Mark reminder as sent
          const marked = await markReminderSent(block.blockId);
          if (marked) {
            remindersSent++;
            console.log(`✅ Reminder sent for block ${block.blockId}`);
          } else {
            const errorMsg = `Failed to mark reminder as sent for block ${block.blockId}`;
            console.error('❌', errorMsg);
            errors.push(errorMsg);
          }
        } else {
          const errorMsg = `Failed to send email for block ${block.blockId}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
        
      } catch (blockError) {
        const errorMsg = `Error processing block ${block.blockId}: ${blockError instanceof Error ? blockError.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    const summary = {
      success: true,
      blocksFound: upcomingBlocks.length,
      remindersSent,
      errors: errors.length,
      timestamp: now.toISOString(),
      successRate: upcomingBlocks.length > 0 ? Math.round((remindersSent / upcomingBlocks.length) * 100) : 0
    };

    console.log('📊 Cron check completed:', summary);

    // Return success response for cron service
    return Response.json({
      ...summary,
      errorDetails: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('💥 Fatal error in cron reminder:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: now.toISOString()
    }, { status: 500 });
  }
}

// Optional: Add security with a simple token
export async function POST(request: NextRequest) {
  // You can add a secret token for extra security
  try {
    const body = await request.json();
    const { token } = body;
    
    // Optional: Check for a secret token
    if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Same logic as GET
    return GET(request);
  } catch (error) {
    return Response.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 });
  }
}