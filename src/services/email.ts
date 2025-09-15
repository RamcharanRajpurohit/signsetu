import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email sending error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export function generateReminderEmail(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Study Block Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .time-block { background: white; padding: 15px; border-radius: 6px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔕 Study Block Reminder</h1>
          </div>
          <div class="content">
            <h2>Your quiet study time is starting soon!</h2>
            <div class="time-block">
              <p><strong>📅 Date:</strong> ${formatDate(startTime)}</p>
              <p><strong>⏰ Start Time:</strong> ${formatTime(startTime)}</p>
              <p><strong>⏰ End Time:</strong> ${formatTime(endTime)}</p>
              <p><strong>⏱️ Duration:</strong> ${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes</p>
            </div>
            <p>Your study block will begin in approximately 10 minutes. Get ready to focus!</p>
            <p><em>Good luck with your studies! 📚</em></p>
          </div>
          <div class="footer">
            <p>Quiet Hours Scheduler - Helping you stay focused</p>
          </div>
        </div>
      </body>
    </html>
  `;
}