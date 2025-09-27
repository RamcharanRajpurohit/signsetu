
---

# Quiet Hours Scheduler

**Manage your study blocks and receive email reminders for scheduled quiet hours.**

🔗 **Live Demo:** [https://quieth.netlify.app/](https://quieth.netlify.app/)

---

## Features
- **Schedule Study Blocks:** Plan and organize your study sessions.
- **Quiet Hours:** Set dedicated quiet hours for focused work.
- **Email Reminders:** Automatically receive email reminders for your scheduled blocks using **cron jobs**.
- **User-Friendly Interface:** Built with Next.js and Tailwind CSS for a seamless experience.

---

## Tech Stack
- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Supabase (Database), Nodemailer (Email Notifications)
- **Database:** MongoDB (via Supabase integration)
- **Automation:** Cron jobs for scheduling email reminders
- **Deployment:** Netlify

---

## Email Reminders with Cron Jobs

### How It Works
1. **User Registration:** Users register and schedule their study blocks or quiet hours.
2. **Cron Job Setup:** A cron job runs at specified intervals (e.g., daily or hourly) to check for upcoming study blocks.
3. **Email Notifications:** Nodemailer sends automated email reminders to users before their scheduled blocks begin.

### Setting Up Cron Jobs
1. **Install `node-cron`:**
   ```bash
   npm install node-cron
   ```

2. **Create a Cron Job Script:**
   Add a script (e.g., `cronJobs.ts`) to your project to handle scheduling and sending emails. Example:
   ```typescript
   import cron from 'node-cron';
   import { sendReminderEmail } from './emailService'; // Your email service logic

   // Run every day at 8 AM
   cron.schedule('0 8 * * *', async () => {
     const upcomingBlocks = await fetchUpcomingBlocks(); // Fetch blocks from Supabase/MongoDB
     upcomingBlocks.forEach(block => {
       sendReminderEmail(block.userEmail, block.startTime, block.duration);
     });
   });
   ```

3. **Integrate with Your Backend:**
   - Call the cron job script when your backend starts (e.g., in `index.ts` or `server.ts`).
   - Ensure your backend is always running (use a service like **Render**, **Railway**, or **Vercel Cron Jobs** for production).

4. **Environment Variables:**
   Add the following to your `.env.local`:
   ```env
   CRON_ENABLED=true
   ```

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Supabase account
- MongoDB Atlas account (or local MongoDB instance)
- Netlify account (for frontend deployment)
- A service to run cron jobs (e.g., **Vercel Cron Jobs**, **Render**, or a custom server)

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/quiet-hours-scheduler.git
   cd quiet-hours-scheduler
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   MONGODB_URI=your-mongodb-uri
   EMAIL_USER=your-email
   EMAIL_PASS=your-email-password
   CRON_ENABLED=true
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Test cron jobs locally:**
   - Manually trigger the cron job script to verify email reminders are sent.

---

## Deployment
- **Frontend:** Deploy to Netlify by connecting your GitHub repository.
- **Backend/Cron Jobs:** Deploy the backend to a service that supports cron jobs (e.g., **Render**, **Railway**, or **Vercel**).

---

## Contributing
Contributions are welcome! Open an issue or submit a pull request.

---

## License
MIT

---
