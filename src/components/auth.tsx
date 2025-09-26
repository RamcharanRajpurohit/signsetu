'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Sun, Shield, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Heart } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Enhanced validation with visual feedback
  const validateInputs = () => {
    const errors: { [key: string]: string } = {};
    
    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (mode !== 'forgot-password') {
      if (!password.trim()) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    // Confirm password validation
    if ((mode === 'signup' || mode === 'reset-password')) {
      if (!confirmPassword.trim()) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setMessage('Please fix the errors below');
      return false;
    }
    
    return true;
  };

  // Enhanced auth handler - KEEPING YOUR ORIGINAL SUPABASE LOGIC
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setFieldErrors({});

    if (!validateInputs()) return;

    setLoading(true);

    try {
      switch (mode) {
        case 'login': {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (loginError) {
            if (
              loginError.message.toLowerCase().includes('email not confirmed') || 
              loginError.message.toLowerCase().includes('signup requires email confirmation')
            ) {
              setUnverifiedEmail(email);
              setMessage('Your email is not verified. Check your inbox or click "Resend verification email" below.');
            } else {
              setMessage('Invalid credentials. Please try again.');
            }
          } else if (loginData.user) {
            if (!loginData.user.email_confirmed_at) {
              setUnverifiedEmail(email);
              setMessage('Your email is not verified. Check your inbox or click "Resend verification email" below.');
              await handleResendVerification();
            } else {
              setMessage('Successfully signed in!');
              onAuthChange(true);
            }
          }
          break;
        }

        case 'signup': {
          const { error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (signupError) throw signupError;
          setUnverifiedEmail(email);
          setMode('email-sent');
          break;
        }

        case 'forgot-password': {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });

          if (resetError) throw resetError;
          setMode('email-sent');
          break;
        }

        case 'reset-password': {
          const { error: updateError } = await supabase.auth.updateUser({
            password: password,
          });

          if (updateError) throw updateError;
          setMessage('Password updated successfully! You can now sign in.');
          setMode('login');
          break;
        }
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    switch (emailDomain) {
      case 'gmail.com': emailUrl = 'https://mail.google.com'; break;
      case 'yahoo.com': emailUrl = 'https://mail.yahoo.com'; break;
      case 'outlook.com':
      case 'hotmail.com': emailUrl = 'https://outlook.live.com'; break;
      default: emailUrl = `mailto:${email}`;
    }

    window.open(emailUrl, '_blank');
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setUnverifiedEmail('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFieldErrors({});
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

  // Email sent success screen
  if (mode === 'email-sent') {
    const isPasswordReset = !unverifiedEmail;
    const emailForDisplay = unverifiedEmail || email;

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-rose-50">
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Background blur effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-rose-200/20 rounded-3xl blur-3xl"></div>
            
            <div className="relative bg-white/90 backdrop-blur-md border-2 border-yellow-200/50 rounded-3xl shadow-xl p-8">
              <div className="text-center">
                {/* Success icon with gradient */}
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg mb-6">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>

                {/* Header with gradient text */}
                <div className="flex items-center justify-center mb-4">
                  <Sun className="h-8 w-8 text-yellow-500 mr-3" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-rose-600 bg-clip-text text-transparent">
                    Quiet Hours Scheduler
                  </h2>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {isPasswordReset ? 'Reset Email Sent!' : 'Verification Email Sent!'}
                </h3>
                
                <p className="text-gray-600 text-lg mb-6">
                  We've sent {isPasswordReset ? 'a password reset link' : 'a verification link'} to:
                </p>
                
                <div className="bg-gradient-to-r from-yellow-100 to-rose-100 border-2 border-yellow-200 px-6 py-4 rounded-xl mb-8">
                  <p className="font-semibold text-gray-800 text-lg">{emailForDisplay}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center text-gray-600 bg-gradient-to-r from-yellow-50 to-rose-50 p-6 rounded-xl border border-yellow-200">
                  <p className="mb-4 text-lg">
                    {isPasswordReset 
                      ? 'Click the link in your email to reset your password. The link will expire in 1 hour.' 
                      : 'Click the link in your email to verify your account and complete the registration.'}
                  </p>
                  <p className="text-sm text-gray-500">
                    💡 Didn't receive the email? Check your spam folder or try again in a few minutes.
                  </p>
                </div>

                {/* Action buttons with gradients */}
                <button
                  onClick={openEmail}
                  className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white text-lg font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Open Email App
                </button>

                {!isPasswordReset && (
                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-6 py-4 bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-300 text-gray-700 text-lg font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <RefreshCw className={`w-5 h-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Sending...' : 'Resend Email'}
                  </button>
                )}

                {message && (
                  <div className={`text-center p-4 rounded-xl text-lg font-medium ${
                    message.includes('error') || message.includes('Error') || message.includes('Failed')
                      ? 'bg-rose-50 text-rose-700 border-2 border-rose-200' 
                      : 'bg-green-50 text-green-700 border-2 border-green-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="text-center pt-4">
                  <button
                    onClick={() => switchMode('login')}
                    className="flex items-center justify-center mx-auto text-yellow-600 hover:text-rose-600 text-lg font-medium transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-rose-50">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Background blur effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-rose-200/20 rounded-3xl blur-3xl"></div>
          
          <div className="relative bg-white/90 backdrop-blur-md border-2 border-yellow-200/50 rounded-3xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-yellow-400 to-rose-400 rounded-2xl shadow-lg mr-3">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <Sun className="h-8 w-8 text-yellow-500" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-rose-600 bg-clip-text text-transparent mb-2">
                Quiet Hours Scheduler
              </h2>
              <p className="text-gray-600 text-lg font-medium">
                {getTitle()}
              </p>
            </div>

            <div className="space-y-6">{/* Form wrapper */}
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`block w-full pl-10 pr-3 py-4 border-2 ${
                      fieldErrors.email 
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
                        : 'border-yellow-200 focus:border-rose-400 focus:ring-rose-200'
                    } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 text-lg transition-all`}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-2 text-sm text-rose-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              {mode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    {mode === 'reset-password' ? 'New Password' : 'Password'} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      className={`block w-full pl-10 pr-12 py-4 border-2 ${
                        fieldErrors.password 
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
                          : 'border-yellow-200 focus:border-rose-400 focus:ring-rose-200'
                      } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 text-lg transition-all`}
                      placeholder={mode === 'reset-password' ? 'Enter new password' : 'Enter your password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-rose-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-sm text-rose-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password Field */}
              {(mode === 'signup' || mode === 'reset-password') && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className={`block w-full pl-10 pr-12 py-4 border-2 ${
                        fieldErrors.confirmPassword 
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
                          : 'border-yellow-200 focus:border-rose-400 focus:ring-rose-200'
                      } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 text-lg transition-all`}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-rose-600 transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-2 text-sm text-rose-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className={`text-center p-4 rounded-xl text-lg font-medium ${
                  message.toLowerCase().includes('error') || 
                  message.toLowerCase().includes('not verified') || 
                  message.toLowerCase().includes('invalid credentials') ||
                  message.toLowerCase().includes('fix the errors')
                    ? 'bg-rose-50 text-rose-700 border-2 border-rose-200'
                    : 'bg-green-50 text-green-700 border-2 border-green-200'
                }`}>
                  {message}
                </div>
              )}

              {/* Resend verification button */}
              {unverifiedEmail && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="text-yellow-600 hover:text-rose-600 text-lg font-medium underline disabled:opacity-50 transition-colors"
                  >
                    Resend verification email
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-yellow-400 to-rose-400 hover:from-yellow-500 hover:to-rose-500 text-white text-xl font-bold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading && <RefreshCw className="w-5 h-5 mr-3 animate-spin" />}
                {getButtonText()}
              </button>

              {/* Navigation Links */}
              <div className="space-y-4">
                {mode === 'login' && (
                  <>
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-yellow-600 hover:text-rose-600 text-lg font-medium transition-colors"
                        onClick={() => switchMode('forgot-password')}
                      >
                        Forgot your password?
                      </button>
                    </div>
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-yellow-600 hover:text-rose-600 text-lg font-medium transition-colors"
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
                      className="text-yellow-600 hover:text-rose-600 text-lg font-medium transition-colors"
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
                      className="flex items-center justify-center mx-auto text-yellow-600 hover:text-rose-600 text-lg font-medium transition-colors"
                      onClick={() => switchMode('login')}
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back to sign in
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-600">
            <p className="flex items-center justify-center text-lg">
              Built with <Heart className="h-5 w-5 text-rose-500 mx-2" /> for peaceful productivity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}