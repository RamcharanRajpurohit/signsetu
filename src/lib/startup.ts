import { startScheduler } from './scheduler';

console.log('🌟 Application startup script loaded');

// Auto-start the scheduler when the app starts
if (typeof window === 'undefined') { // Only run on server side
  console.log('🖥️ Server-side detected, initializing scheduler...');
  
  // Small delay to ensure all services are ready
  setTimeout(() => {
    console.log('🚀 Auto-starting reminder scheduler...');
    try {
      startScheduler();
      console.log('✅ Scheduler auto-started successfully');
    } catch (error) {
      console.error('❌ Failed to auto-start scheduler:', error);
    }
  }, 5000); // 5 second delay
} else {
  console.log('🌐 Client-side detected, skipping scheduler initialization');
}