import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { Eye, EyeOff, GraduationCap, BookOpen, Users, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classCodeError, setClassCodeError] = useState('');
  const [classCodeValid, setClassCodeValid] = useState(false);
  const [classCodeChecking, setClassCodeChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const lookupClassCode = async (code: string): Promise<string | null> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return null;
    const snap = await getDocs(
      query(collection(db, 'classrooms'), where('classroomId', '==', trimmed))
    );
    return snap.empty ? null : snap.docs[0].id;
  };

  const handleClassCodeBlur = async () => {
    if (!classCode.trim()) {
      setClassCodeError('');
      setClassCodeValid(false);
      return;
    }
    setClassCodeChecking(true);
    const docId = await lookupClassCode(classCode);
    setClassCodeChecking(false);
    if (docId) {
      setClassCodeValid(true);
      setClassCodeError('');
    } else {
      setClassCodeValid(false);
      setClassCodeError('No class found with this code.');
    }
  };

  const handleClassCodeChange = (val: string) => {
    setClassCode(val);
    setClassCodeError('');
    setClassCodeValid(false);
  };

  const joinClassIfProvided = async (uid: string) => {
    if (!classCode.trim()) return;
    const docId = await lookupClassCode(classCode);
    if (docId) {
      await updateDoc(doc(db, 'classrooms', docId), {
        pendingRequests: arrayUnion({ uid, timestamp: new Date().toISOString() }),
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (classCode.trim() && classCodeError) {
      setError('Please clear the invalid class code or enter a correct one.');
      return;
    }
    if (classCode.trim() && !classCodeValid) {
      // not yet validated — check now
      const docId = await lookupClassCode(classCode);
      if (!docId) {
        setClassCodeError('No class found with this code.');
        setClassCodeValid(false);
        setError('Please clear the invalid class code or enter a correct one.');
        return;
      }
      setClassCodeValid(true);
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userData = role === 'student'
        ? { role: 'student', name, email, approved: true }
        : { role: 'teacher', designation: 'teacher', name, email, subject, approved: false };

      await setDoc(doc(db, 'users', uid), userData);

      if (role === 'student') {
        await joinClassIfProvided(uid);
      }

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

  const handleGoogleSignup = async () => {
    setError('');

    if (role === 'teacher' && !subject.trim()) {
      setError('Please enter your subject before signing up with Google.');
      return;
    }

    if (classCode.trim() && classCodeError) {
      setError('Please clear the invalid class code or enter a correct one.');
      return;
    }
    if (classCode.trim() && !classCodeValid) {
      const docId = await lookupClassCode(classCode);
      if (!docId) {
        setClassCodeError('No class found with this code.');
        setClassCodeValid(false);
        setError('Please clear the invalid class code or enter a correct one.');
        return;
      }
      setClassCodeValid(true);
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const uid = result.user.uid;
      const existingDoc = await getDoc(doc(db, 'users', uid));
      if (existingDoc.exists()) {
        navigate('/');
        return;
      }
      const googleName = result.user.displayName || '';
      const googleEmail = result.user.email || '';

      const userData = role === 'student'
        ? { role: 'student', name: googleName, email: googleEmail, approved: true }
        : { role: 'teacher', designation: 'teacher', name: googleName, email: googleEmail, subject, approved: false };

      await setDoc(doc(db, 'users', uid), userData);

      if (role === 'student') {
        await joinClassIfProvided(uid);
      }

      if (role === 'teacher') {
        await sendAdminNotification(
          'New Teacher Signup',
          `Teacher ${googleName} (${googleEmail}) has registered via Google and is awaiting approval.`,
          'new_teacher_signup',
          { uid, name: googleName, email: googleEmail }
        );
      }

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account with this Google email already exists. Please sign in with email and password instead.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-up failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const inputClass =
    'w-full px-5 py-4 border-2 border-black rounded-2xl bg-white focus:outline-none focus:border-[#FF6B57] transition-colors placeholder-gray-300 text-sm';
  const labelClass = 'block text-xs font-bold text-black uppercase tracking-widest mb-2';

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Left panel */}
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="MyMentor" className="h-16 w-auto object-contain mx-auto" />
        </div>

        <div className="w-full max-w-md">
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
                role === 'student' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
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
                role === 'teacher' ? 'bg-[#FF6B57] text-white' : 'bg-white text-black hover:bg-black/5'
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

          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-black rounded-full text-base font-bold text-black bg-white hover:bg-black/5 focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed mb-2"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Connecting…' : 'Sign up with Google'}
          </button>
          {role === 'teacher' && (
            <p className="text-xs text-gray-400 text-center mb-6">Fill in your subject below first, then click above.</p>
          )}
          {role === 'student' && (
            <p className="text-xs text-gray-400 text-center mb-6">Optionally enter a class code below, then click above.</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
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

            {/* Student: optional class code */}
            {role === 'student' && (
              <div>
                <label className={labelClass}>
                  Class Code <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className={`${inputClass} pr-12 uppercase ${
                      classCodeError
                        ? 'border-red-500 focus:border-red-500'
                        : classCodeValid
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="e.g. PHY9K2X"
                    value={classCode}
                    onChange={(e) => handleClassCodeChange(e.target.value)}
                    onBlur={handleClassCodeBlur}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {classCodeChecking && <Loader size={16} className="animate-spin text-gray-400" />}
                    {!classCodeChecking && classCodeValid && <CheckCircle size={16} className="text-green-500" />}
                    {!classCodeChecking && classCodeError && <XCircle size={16} className="text-red-500" />}
                  </div>
                </div>
                {classCodeError && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{classCodeError} Clear it to sign up without a class.</p>
                )}
                {classCodeValid && (
                  <p className="mt-1.5 text-xs text-green-600 font-medium">Class found! You'll be added as a pending member.</p>
                )}
              </div>
            )}

            {/* Teacher: subject */}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 border-2 border-black rounded-full text-base font-bold text-white bg-black hover:bg-[#FF6B57] hover:border-[#FF6B57] focus:outline-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

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
