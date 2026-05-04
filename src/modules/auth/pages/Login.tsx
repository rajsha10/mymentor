import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { Eye, EyeOff, BookOpen, GraduationCap, Lightbulb } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
