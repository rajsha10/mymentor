import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { Eye, EyeOff, GraduationCap, BookOpen, Users } from 'lucide-react';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userData = role === 'student'
        ? { role: 'student', name, email, class: studentClass, section, rollNumber, approved: true }
        : { role: 'teacher', designation: 'teacher', name, email, subject, approved: false };

      await setDoc(doc(db, 'users', uid), userData);

      if (role === 'teacher') {
        await sendAdminNotification(
          'New Teacher Signup',
          `Teacher ${name} (${email}) has registered and is awaiting approval.`,
          'new_teacher_signup',
          { uid, name, email }
        );
      }

      navigate('/');
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-5 py-4 border-2 border-black rounded-2xl bg-white focus:outline-none focus:border-[#FF6B57] transition-colors placeholder-gray-300 text-sm';
  const labelClass = 'block text-xs font-bold text-black uppercase tracking-widest mb-2';

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full border-[3px] border-white/10" />
        <div className="absolute top-40 -left-10 w-40 h-40 rounded-full border-[3px] border-[#FF6B57]/20" />
        <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-[#FF6B57]/10" />

        <div>
          <img src="/logo.png" alt="MyMentor" className="h-14 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="space-y-8 z-10">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Join the<br />
            <span className="text-[#FF6B57]">smarter</span><br />
            classroom.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-xs">
            Whether you're a student eager to learn or a teacher ready to inspire — MyMentor has you covered.
          </p>

          <div className="space-y-4">
            {[
              { icon: GraduationCap, text: 'Students get instant access after signup' },
              { icon: BookOpen, text: 'All resources organised by class and subject' },
              { icon: Users, text: 'Connect with teachers and classmates easily' },
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

        <p className="text-white/30 text-xs z-10">© 2025 MyMentor. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="MyMentor" className="h-16 w-auto object-contain mx-auto" />
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight">Create account</h2>
            <p className="mt-2 text-gray-500 text-sm">Join MyMentor and start learning smarter.</p>
          </div>

          {/* Role toggle */}
          <div className="flex rounded-2xl border-2 border-black overflow-hidden mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-3.5 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                role === 'student'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black/5'
              }`}
            >
              <GraduationCap size={16} />
              Student
            </button>
            <div className="w-0.5 bg-black" />
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-3.5 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                role === 'teacher'
                  ? 'bg-[#FF6B57] text-white'
                  : 'bg-white text-black hover:bg-black/5'
              }`}
            >
              <BookOpen size={16} />
              Teacher
            </button>
          </div>

          {/* Teacher pending notice */}
          {role === 'teacher' && (
            <div className="mb-6 flex items-start gap-3 bg-[#FF6B57]/10 border-2 border-[#FF6B57] text-[#FF6B57] p-4 rounded-2xl text-sm font-medium">
              <span className="mt-0.5 flex-shrink-0">ℹ</span>
              <span>Teacher accounts require admin approval before you can access the platform.</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border-2 border-red-500 text-red-600 p-4 rounded-2xl text-sm font-medium">
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Common fields */}
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                required
                className={inputClass}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pr-14`}
                  placeholder="Min. 6 characters"
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

            {/* Student-specific fields */}
            {role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Class</label>
                    <select
                      required
                      className={inputClass}
                      value={studentClass}
                      onChange={(e) => { setStudentClass(e.target.value); setSection(''); }}
                    >
                      <option value="">Select</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Section / Stream</label>
                    <select
                      required
                      disabled={!studentClass}
                      className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    >
                      <option value="">Select</option>
                      {(studentClass === '11' || studentClass === '12') ? (
                        <>
                          <option value="SCIENCE">Science</option>
                          <option value="COMMERCE">Commerce</option>
                          <option value="HUMANITIES">Humanities</option>
                        </>
                      ) : (
                        ['A', 'B', 'C', 'D'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Roll Number</label>
                  <input
                    type="text"
                    required
                    className={inputClass}
                    placeholder="e.g. 24001"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Teacher-specific fields */}
            {role === 'teacher' && (
              <div>
                <label className={labelClass}>Subject</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  placeholder="e.g. Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 border-2 border-black rounded-full text-base font-bold text-white bg-black hover:bg-[#FF6B57] hover:border-[#FF6B57] focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-gray-400 font-medium">Already have an account?</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <Link
            to="/login"
            className="w-full flex justify-center py-4 px-6 border-2 border-black rounded-full text-base font-bold text-black bg-transparent hover:bg-black hover:text-white focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
