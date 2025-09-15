import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabaseAdmin';

export interface AuthUser {
  id: string;
  email: string;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('Authentication error:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email || ''
    };
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return null;
  }
}

export function createAuthResponse(message: string, status: number = 401) {
  return Response.json({ error: message }, { status });
}