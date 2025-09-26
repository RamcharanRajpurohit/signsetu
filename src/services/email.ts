import nodemailer from 'nodemailer';


// Environment variables check
const smtpHost = process.env.MAIL_HOST || 'smtp.gmail.com';
const smtpPort = process.env.MAIL_PORT || '587';
const smtpUser = process.env.MAIL_USER;
const smtpPass = process.env.MAIL_PASS;
const fromEmail = process.env.MAIL_USER; // Use MAIL_USER as FROM_EMAIL



if (!smtpUser || !smtpPass) {
  console.error('❌ Required email environment variables are missing');
  throw new Error('MAIL_USER and MAIL_PASS are required');
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(smtpPort),
  secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});


// Verify connection configuration
transporter.verify((error:any) => {
  if (error) {
    console.error(error);
  } else {
  }
});

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {

  
  try {
    const mailOptions = {
      from: fromEmail!,
      to,
      subject,
      html,
    };
    
    const info = await transporter.sendMail(mailOptions);

  
    return true;
  } catch (error) {
     return false;
  }
}

export function generateReminderEmail(startTime: Date, endTime: Date): string {
   
  // Convert to user's local timezone (assuming Indian timezone for now)
  const formatTime = (date: Date) => {
    const formatted = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });

    return formatted;
  };

  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
 
    return formatted;
  };

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
 

  const emailHtml = `
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
              <p><strong>⏱️ Duration:</strong> ${duration} minutes</p>
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

  return emailHtml;
}