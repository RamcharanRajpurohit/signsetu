// netlify/functions/scheduled-reminder.js
const { MongoClient } = require('mongodb');

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com';
const MAIL_PORT = process.env.MAIL_PORT || '587';
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔄 Scheduled reminder function loaded');

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  cachedDb = db;
  return db;
}

// Email service using Nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: MAIL_HOST,
  port: parseInt(MAIL_PORT),
  secure: parseInt(MAIL_PORT) === 465,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: MAIL_USER,
      to,
      subject,
      html,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
}

// Generate reminder email HTML
function generateReminderEmail(startTime, endTime) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));

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
}

// Supabase Admin Client
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Main scheduled function
exports.handler = async (event, context) => {
  const now = new Date();
  console.log(`\n⏰ [${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Running scheduled reminder check...`);
  
  try {
    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    // Find upcoming blocks (next 10 minutes)
    const futureTime = new Date(now.getTime() + 10 * 60 * 1000);
    
    const upcomingBlocks = await db.collection('study_blocks').find({
      startTime: { $gte: now, $lte: futureTime },
      reminderSent: false
    }).toArray();
    
    console.log(`📊 Found ${upcomingBlocks.length} upcoming blocks`);
    
    if (upcomingBlocks.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No upcoming blocks',
          timestamp: now.toISOString()
        })
      };
    }
    
    let remindersSent = 0;
    let errors = [];
    
    // Process each block
    for (const block of upcomingBlocks) {
      try {
        console.log(`📤 Processing block ${block.blockId}...`);
        
        // Get user email from Supabase
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(block.userId);
        
        if (userError || !userData?.user?.email) {
          const errorMsg = `User not found for block ${block.blockId}`;
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
          await db.collection('study_blocks').updateOne(
            { blockId: block.blockId },
            { $set: { reminderSent: true } }
          );
          
          remindersSent++;
          console.log(`✅ Reminder sent for block ${block.blockId}`);
        } else {
          errors.push(`Failed to send email for block ${block.blockId}`);
        }
        
      } catch (blockError) {
        const errorMsg = `Error processing block ${block.blockId}: ${blockError.message}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const summary = {
      blocksFound: upcomingBlocks.length,
      remindersSent,
      errors: errors.length,
      timestamp: now.toISOString()
    };
    
    console.log('📊 Scheduled check completed:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        summary,
        errors: errors.length > 0 ? errors : undefined
      })
    };
    
  } catch (error) {
    console.error('💥 Scheduled function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: now.toISOString()
      })
    };
  }
};