import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function AuthModal({ isOpen, onClose }) {
    const { signup, login, resetPassword, currentUser, resendVerificationEmail, isEmailVerified } = useAuth();

    const [mode, setMode] = useState('login'); // 'login', 'signup', 'reset', 'verify'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                await signup(email, password);
                setSuccess('Account created! Check your email to verify.');
                setMode('verify');
            } else if (mode === 'login') {
                const result = await login(email, password);
                if (!result.user.emailVerified) {
                    setMode('verify');
                    setSuccess('Please verify your email first.');
                } else {
                    onClose();
                }
            } else if (mode === 'reset') {
                await resetPassword(email);
                setSuccess('Password reset email sent!');
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, ''));
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setLoading(true);
        try {
            await resendVerificationEmail();
            setSuccess('Verification email sent!');
        } catch (err) {
            setError('Failed to send verification email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 pb-0">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'reset' && 'Reset Password'}
                        {mode === 'verify' && 'Verify Email'}
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">
                        {mode === 'login' && 'Sign in to sync your notes across devices'}
                        {mode === 'signup' && 'Join LectureSnap to save your study notes'}
                        {mode === 'reset' && 'Enter your email to reset password'}
                        {mode === 'verify' && 'Check your inbox for verification link'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {mode === 'verify' ? (
                        <div className="text-center space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                We sent a verification link to <strong>{email || currentUser?.email}</strong>
                            </p>
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={loading}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            >
                                Didn't receive it? Resend
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            {mode !== 'reset' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Confirm Password (Signup only) */}
                            {mode === 'signup' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Forgot Password Link */}
                            {mode === 'login' && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Submit Button */}
                    {mode !== 'verify' && (
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'reset' && 'Send Reset Link'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 pt-0 text-center">
                    {mode === 'login' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Don't have an account?{' '}
                            <button
                                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                            >
                                Sign up
                            </button>
                        </p>
                    )}
                    {(mode === 'signup' || mode === 'reset' || mode === 'verify') && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Already have an account?{' '}
                            <button
                                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        Continue without account
                    </button>
                </div>
            </div>
        </div>
    );
}
