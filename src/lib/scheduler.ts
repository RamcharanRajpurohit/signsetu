import { getUpcomingBlocks, markReminderSent } from '@/services/blocks';
import { sendEmail, generateReminderEmail } from '@/services/email';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

console.log('🕐 Internal Scheduler initialized');

class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private checkInterval: number = 60000; // Check every minute
  
  constructor() {
    console.log('📅 ReminderScheduler instance created');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting internal reminder scheduler...');
    console.log(`- Check interval: ${this.checkInterval / 1000} seconds`);
    
    this.isRunning = true;
    
    // Run immediately on start
    this.checkReminders();
    
    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, this.checkInterval);
    
    console.log('✅ Scheduler started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('🛑 Stopping internal reminder scheduler...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('✅ Scheduler stopped successfully');
  }

  getStatus(): { isRunning: boolean; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval
    };
  }

  private async checkReminders(): Promise<void> {
    const now = new Date();
    console.log(`\n⏰ [${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Running reminder check...`);

    try {
      const upcomingBlocks = await getUpcomingBlocks(10);
      
      if (upcomingBlocks.length === 0) {
        console.log('ℹ️ No upcoming blocks found');
        return;
      }

      console.log(`📊 Found ${upcomingBlocks.length} blocks needing reminders`);

      let remindersSent = 0;
      let errors: string[] = [];

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
        blocksFound: upcomingBlocks.length,
        remindersSent,
        errors: errors.length,
        successRate: upcomingBlocks.length > 0 ? Math.round((remindersSent / upcomingBlocks.length) * 100) : 0
      };

      console.log('📊 Check completed:', summary);

      if (errors.length > 0) {
        console.log('❌ Errors:', errors);
      }

    } catch (error) {
      console.error('💥 Fatal error in reminder check:', error);
    }
  }
}

// Global scheduler instance
let schedulerInstance: ReminderScheduler | null = null;

export function getScheduler(): ReminderScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ReminderScheduler();
  }
  return schedulerInstance;
}

export function startScheduler(): void {
  const scheduler = getScheduler();
  scheduler.start();
}

export function stopScheduler(): void {
  const scheduler = getScheduler();
  scheduler.stop();
}

export function getSchedulerStatus(): { isRunning: boolean; checkInterval: number } {
  const scheduler = getScheduler();
  return scheduler.getStatus();
}