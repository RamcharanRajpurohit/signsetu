import { createClient } from "@supabase/supabase-js";

console.log('🔧 Initializing Supabase Admin...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('📋 Environment check:');
console.log('- Supabase URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
console.log('- Service Role Key:', supabaseServiceKey ? '✅ Present' : '❌ Missing');

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in environment variables');
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in env");
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in env");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('✅ Supabase Admin client initialized successfully');