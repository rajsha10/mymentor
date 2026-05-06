import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../config/firebase';
import { Eye, EyeOff, BookOpen, GraduationCap, Lightbulb } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const docSnap = await getDoc(doc(db, 'users', result.user.uid));
      if (!docSnap.exists()) {
        await auth.signOut();
        setError('No account found for this Google account. Please sign up first.');
      }
      // If doc exists, AuthContext + AuthGuard handle the redirect automatically
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is registered with a different sign-in method. Please use email and password.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Incorrect email or password. Please try again.'
        : err.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Left panel — brand / study mood (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full border-[3px] border-white/10" />
        <div className="absolute top-40 -left-10 w-40 h-40 rounded-full border-[3px] border-[#FF6B57]/20" />
        <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-[#FF6B57]/10" />

        {/* Logo */}
        <div>
          <img src="/logo.png" alt="MyMentor" className="h-24 w-auto object-contain brightness-0 invert" />
        </div>

        {/* Centre copy */}
        <div className="space-y-8 z-10">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Your learning<br />
            <span className="text-[#FF6B57]">journey</span><br />
            starts here.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-xs">
            A smart classroom platform built for students and teachers who want more.
          </p>

          <div className="space-y-4">
            {[
              { icon: BookOpen, text: 'Access all your study materials in one place' },
              { icon: GraduationCap, text: 'Track progress and stay ahead of the curve' },
              { icon: Lightbulb, text: 'AI-powered tools to help you learn faster' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B57]/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-[#FF6B57]" />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-white/30 text-xs z-10">© 2025 MyMentor. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="MyMentor" className="h-16 w-auto object-contain mx-auto" />
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight">Welcome back</h2>
            <p className="mt-2 text-gray-500 text-sm">Sign in to continue your learning journey.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-[#FF6B57]/10 border-2 border-[#FF6B57] text-[#FF6B57] p-4 rounded-2xl text-sm font-medium">
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black uppercase tracking-widest">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full px-5 py-4 border-2 border-black rounded-2xl bg-white focus:outline-none focus:border-[#FF6B57] transition-colors placeholder-gray-300 text-sm"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full px-5 py-4 pr-14 border-2 border-black rounded-2xl bg-white focus:outline-none focus:border-[#FF6B57] transition-colors placeholder-gray-300 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 border-2 border-black rounded-full text-base font-bold text-white bg-black hover:bg-[#FF6B57] hover:border-[#FF6B57] focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Google sign-in */}
          <div className="mt-4">
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-black/10" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-black rounded-full text-base font-bold text-black bg-white hover:bg-black/5 focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>
          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-gray-400 font-medium">New to MyMentor?</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Signup link */}
          <Link
            to="/signup"
            className="w-full flex justify-center py-4 px-6 border-2 border-black rounded-full text-base font-bold text-black bg-transparent hover:bg-black hover:text-white focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
