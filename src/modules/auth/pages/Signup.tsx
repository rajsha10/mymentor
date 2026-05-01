import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // Student fields
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  // Teacher fields
  const [subject, setSubject] = useState('');
  
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userData = role === 'student' 
        ? {
            role: 'student',
            name,
            email,
            class: studentClass,
            section,
            rollNumber,
            approved: true
          }
        : {
            role: 'teacher',
            designation: 'teacher',
            name,
            email,
            subject,
            approved: false
          };

      await setDoc(doc(db, 'users', uid), userData);

      // Send Admin Notification
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
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full p-10 bg-white rounded-[2rem] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="MyMentor Logo" className="h-48 w-auto object-contain" />
        </div>
        <div>
          <h2 className="text-4xl tracking-tight font-extrabold text-black mb-8 text-center">
            Sign up
          </h2>
        </div>
        
        <div className="flex justify-center space-x-4 mb-8">
          <button
            className={`px-6 py-3 rounded-full font-bold border-2 border-black transition-colors ${role === 'student' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'}`}
            onClick={() => setRole('student')}
            type="button"
          >
            Student
          </button>
          <button
            className={`px-6 py-3 rounded-full font-bold border-2 border-black transition-colors ${role === 'teacher' ? 'bg-[#FF6B57] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent text-black hover:bg-gray-100'}`}
            onClick={() => setRole('teacher')}
            type="button"
          >
            Teacher
          </button>
        </div>

        {error && <div className="bg-[#FF6B57] text-white p-4 rounded-2xl mb-6 font-medium border border-black">{error}</div>}

        <form className="space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
                placeholder="jane@example.com"
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

            {role === 'student' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-black uppercase tracking-wider">Class</label>
                  <select
                    required
                    className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA]"
                    value={studentClass}
                    onChange={(e) => {
                      setStudentClass(e.target.value);
                      setSection(''); // Reset section on class change
                    }}
                  >
                    <option value="">Select Class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-black uppercase tracking-wider">Section / Stream</label>
                  <select
                    required
                    disabled={!studentClass}
                    className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] disabled:opacity-50"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">Select Section</option>
                    {(studentClass === '11' || studentClass === '12') ? (
                      <>
                        <option value="SCIENCE">SCIENCE</option>
                        <option value="COMMERCE">COMMERCE</option>
                        <option value="HUMANITIES">HUMANITIES</option>
                      </>
                    ) : (
                      <>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-black uppercase tracking-wider">Roll Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24001"
                    className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
              </>
            )}

            {role === 'teacher' && (
              <div className="space-y-2">
                 <label className="block text-sm font-bold text-black uppercase tracking-wider">Subject</label>
                 <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-4 px-6 border-2 border-black rounded-full text-lg font-bold text-white bg-black hover:bg-gray-800 focus:outline-none transition-colors mt-8"
          >
            Create Account
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-black hover:text-[#FF6B57] underline decoration-2 underline-offset-4 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
