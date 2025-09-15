import { NextRequest } from 'next/server';
import { getUpcomingBlocks, markReminderSent } from '@/services/blocks';
import { sendEmail, generateReminderEmail } from '@/services/email';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('authorization');
    
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const upcomingBlocks = await getUpcomingBlocks(10);
    let remindersSent = 0;
    let errors: string[] = [];

    console.log(`Processing ${upcomingBlocks.length} upcoming blocks...`);

    for (const block of upcomingBlocks) {
      try {
        // Get user email from Supabase
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(block.userId);
        
        if (userError || !user.user?.email) {
          errors.push(`User not found or no email for block ${block.blockId}`);
          continue;
        }

        // Send reminder email
        const emailHtml = generateReminderEmail(block.startTime, block.endTime);
        const emailSent = await sendEmail({
          to: user.user.email,
          subject: '🔕 Study Block Starting Soon - 10 Minute Reminder',
          html: emailHtml,
        });

        if (emailSent) {
          // Mark reminder as sent
          const marked = await markReminderSent(block.blockId);
          if (marked) {
            remindersSent++;
            console.log(`Reminder sent successfully for block ${block.blockId}`);
          } else {
            errors.push(`Failed to mark reminder as sent for block ${block.blockId}`);
          }
        } else {
          errors.push(`Failed to send email for block ${block.blockId}`);
        }
      } catch (blockError) {
        console.error(`Error processing block ${block.blockId}:`, blockError);
        errors.push(`Error processing block ${block.blockId}: ${blockError}`);
      }
    }

    const response = {
      message: `Processed ${upcomingBlocks.length} blocks`,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Reminder job completed:', response);
    return Response.json(response);
  } catch (error) {
    console.error('Reminder cron job error:', error);
    return Response.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}