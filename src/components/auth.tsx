'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthProps {
  onAuthChange: (isAuthenticated: boolean) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'email-sent';

export function AuthComponent({ onAuthChange }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      switch (mode) {
        case 'login':
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (loginError) {
            // Check if it's an email not confirmed error
            if (loginError.message.toLowerCase().includes('email not confirmed') || 
                loginError.message.toLowerCase().includes('signup requires email confirmation')) {
              setUnverifiedEmail(email);
              setMessage('Your email is not verified. Check your inbox or click "Resend verification email" below.');
            } else {
              throw loginError;
            }
          } else if (loginData.user) {
            // Check if user email is confirmed
            if (!loginData.user.email_confirmed_at) {
              setUnverifiedEmail(email);
              setMessage('Your email is not verified. Check your inbox or click "Resend verification email" below.');
              // Automatically resend verification email
              await handleResendVerification();
            } else {
              setMessage('Successfully signed in!');
              onAuthChange(true);
            }
          }
          break;

        case 'signup':
          if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
          }
          
          const { error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          });
          
          if (signupError) throw signupError;
          setUnverifiedEmail(email);
          setMode('email-sent');
          break;

        case 'forgot-password':
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`
          });
          
          if (resetError) throw resetError;
          setMode('email-sent');
          break;

        case 'reset-password':
          if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
          }
          
          const { error: updateError } = await supabase.auth.updateUser({
            password: password
          });
          
          if (updateError) throw updateError;
          setMessage('Password updated successfully! You can now sign in.');
          setMode('login');
          break;
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail && !email) {
      setMessage('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail || email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      setMessage('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const openEmail = () => {
    const emailDomain = email.split('@')[1];
    let emailUrl = 'mailto:';
    
    // Popular email providers
    switch (emailDomain) {
      case 'gmail.com':
        emailUrl = 'https://mail.google.com';
        break;
      case 'yahoo.com':
        emailUrl = 'https://mail.yahoo.com';
        break;
      case 'outlook.com':
      case 'hotmail.com':
        emailUrl = 'https://outlook.live.com';
        break;
      default:
        emailUrl = `mailto:${email}`;
    }
    
    window.open(emailUrl, '_blank');
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setUnverifiedEmail('');
    // Reset password visibility states
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your account';
      case 'signup': return 'Create a new account';
      case 'forgot-password': return 'Reset your password';
      case 'reset-password': return 'Set new password';
      case 'email-sent': return 'Check your email';
      default: return 'Authentication';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Sign Up';
      case 'forgot-password': return 'Send Reset Email';
      case 'reset-password': return 'Update Password';
      default: return 'Submit';
    }
  };

  // Eye Icon Components
  const EyeIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l-.872-.872m5.242 5.242L15.535 15.535M14.122 14.122l.872.872m-.872-.872l-4.242-4.242" />
    </svg>
  );

  // Email sent success page
  if (mode === 'email-sent') {
    const isPasswordReset = !unverifiedEmail;
    const emailForDisplay = unverifiedEmail || email;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              🔕 Quiet Hours Scheduler
            </h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {isPasswordReset ? 'Password reset email sent!' : 'Verification email sent!'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              We've sent {isPasswordReset ? 'a password reset link' : 'a verification link'} to:
            </p>
            <p className="text-sm font-medium text-gray-900 bg-gray-100 px-4 py-2 rounded-md mb-6">
              {emailForDisplay}
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-4">
                {isPasswordReset 
                  ? 'Click the link in your email to reset your password. The link will expire in 1 hour.' 
                  : 'Click the link in your email to verify your account and complete the registration.'}
              </p>
              <p className="text-xs text-gray-500">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
            </div>

            {/* Open Email Button */}
            <button
              onClick={openEmail}
              className="w-full flex items-center justify-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Open Email App
            </button>

            {/* Resend Email Button */}
            {!isPasswordReset && (
              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Sending...' : 'Resend Email'}
              </button>
            )}
          </div>

          {message && (
            <div className={`text-sm text-center p-3 rounded-md ${
              message.includes('error') || message.includes('Error') || message.includes('Failed')
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={() => switchMode('login')}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🔕 Quiet Hours Scheduler
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getTitle()}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== 'forgot-password' && (
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder={mode === 'reset-password' ? 'New password' : 'Password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            )}

            {(mode === 'signup' || mode === 'reset-password') && (
              <div className="relative">
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`text-sm text-center ${
              message.includes('error') || message.includes('Error') || message.includes('not verified') 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {message}
            </div>
          )}

          {/* Resend verification email button */}
          {unverifiedEmail && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-500 text-sm underline disabled:opacity-50"
              >
                Resend verification email
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {getButtonText()}
            </button>
          </div>

          {/* Navigation buttons */}
          <div className="space-y-2">
            {mode === 'login' && (
              <>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-indigo-600 hover:text-indigo-500 text-sm"
                    onClick={() => switchMode('forgot-password')}
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-indigo-600 hover:text-indigo-500 text-sm"
                    onClick={() => switchMode('signup')}
                  >
                    Don't have an account? Sign up
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500 text-sm"
                  onClick={() => switchMode('login')}
                >
                  Already have an account? Sign in
                </button>
              </div>
            )}

            {(mode === 'forgot-password' || mode === 'reset-password') && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500 text-sm"
                  onClick={() => switchMode('login')}
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
