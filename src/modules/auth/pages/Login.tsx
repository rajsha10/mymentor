import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthGuard in App.tsx detects the auth state change and redirects to the correct dashboard
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="max-w-md w-full p-10 bg-white rounded-[2rem] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="MyMentor Logo" className="h-48 w-auto object-contain" />
        </div>
        <h2 className="text-4xl tracking-tight font-extrabold text-black mb-8 text-center">
          Log in
        </h2>
        {error && <div className="bg-[#FF6B57] text-white p-4 rounded-2xl mb-6 font-medium border border-black">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-4 px-6 border-2 border-black rounded-full text-lg font-bold text-white bg-black hover:bg-gray-800 focus:outline-none transition-colors mt-8"
          >
            Sign In
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-black hover:text-[#FF6B57] underline decoration-2 underline-offset-4 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
