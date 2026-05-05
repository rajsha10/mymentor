import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { linkWithPopup, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { db, googleProvider } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Mail, Shield, Globe, CheckCircle, AlertCircle, Save, Hash, Users, Sparkles, Fingerprint, ExternalLink } from 'lucide-react';

export default function Profile() {
  const { user, userData } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [subject, setSubject] = useState(userData?.subject || '');
  const [studentClass, setStudentClass] = useState(userData?.class || '');
  const [section, setSection] = useState(userData?.section || '');
  const [rollNumber, setRollNumber] = useState(userData?.rollNumber || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isGoogleLinked = userData?.googleConnected || user?.providerData.some(p => p.providerId === 'google.com');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        subject,
        class: studentClass,
        section,
        rollNumber
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const linkGoogle = async () => {
    if (!user) return;
    try {
      const auth = getAuth();
      await linkWithPopup(user, googleProvider);
      
      await updateDoc(doc(db, 'users', user.uid), {
        googleConnected: true
      });
      
      setSuccess('Google account linked successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError("Failed to link Google account: " + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10 p-3 sm:p-8 lg:p-12 transition-all duration-500 overflow-x-hidden">
      {/* Profile Header Card */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-gradient-to-br from-[#FF6B57] via-[#FF8E7E] to-[#FFB0A4] p-6 sm:p-12 border-b-[3px] border-black relative overflow-hidden group">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 sm:-mr-20 sm:-mt-20 opacity-10 rotate-12 transition-transform group-hover:rotate-45 duration-1000">
            <Fingerprint className="h-48 w-48 sm:h-80 sm:w-80 text-black" />
          </div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 opacity-5 transition-transform group-hover:-translate-x-4 duration-1000">
            <Sparkles className="h-24 w-24 sm:h-40 sm:w-40 text-black" />
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-10 relative z-10">
            <div className="relative group/avatar">
              <div className="h-28 w-28 sm:h-40 sm:w-40 rounded-[1.5rem] sm:rounded-[2.5rem] border-[3px] sm:border-[4px] border-black bg-white flex items-center justify-center text-black text-5xl sm:text-7xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover/avatar:-rotate-3 duration-300">
                {userData?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-yellow-400 border-[2px] sm:border-[3px] border-black p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
              </div>
            </div>
            
            <div className="text-center sm:text-left space-y-3 sm:space-y-4">
              <div>
                <h1 className="text-3xl sm:text-6xl font-black text-black tracking-tight leading-tight break-words max-w-[calc(100vw-4rem)]">
                  {userData?.name}
                </h1>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <span className="bg-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-wider text-[10px] sm:text-sm">
                    {userData?.role}
                  </span>
                  <span className="bg-blue-400 px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-wider text-[10px] sm:text-sm">
                    {userData?.designation || 'Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-12 bg-[#FFFBF0]">
          <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
            {/* General Info Section */}
            <div className="md:col-span-2 flex items-center space-x-3 sm:space-x-4 mb-2">
              <div className="h-[2px] sm:h-[3px] flex-grow bg-black opacity-10"></div>
              <h3 className="text-sm sm:text-xl font-black text-black uppercase tracking-widest px-2 sm:px-4 shrink-0">Account Information</h3>
              <div className="h-[2px] sm:h-[3px] flex-grow bg-black opacity-10"></div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Full Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black focus:ring-0 focus:bg-white transition-all outline-none font-bold text-base sm:text-lg bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] sm:focus:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]"
                />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Email Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={user?.email || ''}
                  readOnly
                  className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black bg-gray-100 text-gray-500 outline-none font-bold text-base sm:text-lg cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                />
                <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Role Specific Section */}
            <div className="md:col-span-2 flex items-center space-x-3 sm:space-x-4 mt-2 sm:mt-4 mb-2">
              <div className="h-[2px] sm:h-[3px] flex-grow bg-black opacity-10"></div>
              <h3 className="text-sm sm:text-xl font-black text-black uppercase tracking-widest px-2 sm:px-4 shrink-0">Work & Studies</h3>
              <div className="h-[2px] sm:h-[3px] flex-grow bg-black opacity-10"></div>
            </div>

            {userData?.role === 'teacher' && (
              <div className="md:col-span-2 space-y-3 sm:space-y-4">
                <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Assigned Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Physics..."
                  className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black focus:ring-0 focus:bg-white transition-all outline-none font-bold text-base sm:text-lg bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] sm:focus:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]"
                />
              </div>
            )}

            {userData?.role === 'student' && (
              <>
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                    <Hash className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Class
                  </label>
                  <select
                    className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black focus:ring-0 focus:bg-white transition-all outline-none font-bold text-base sm:text-lg bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer appearance-none"
                    value={studentClass}
                    onChange={(e) => {
                      setStudentClass(e.target.value);
                      setSection('');
                    }}
                  >
                    <option value="">Select Class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>Class {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Section / Stream
                  </label>
                  <select
                    className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black focus:ring-0 focus:bg-white transition-all outline-none font-bold text-base sm:text-lg bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer appearance-none"
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
                <div className="md:col-span-2 space-y-3 sm:space-y-4">
                  <label className="text-xs sm:text-sm font-black text-black flex items-center uppercase tracking-widest ml-1">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[#FF6B57]" /> Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                    className="w-full px-4 py-4 sm:px-6 sm:py-5 rounded-[1rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black focus:ring-0 focus:bg-white transition-all outline-none font-bold text-base sm:text-lg bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] sm:focus:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]"
                  />
                </div>
              </>
            )}

            {/* Form Footer */}
            <div className="md:col-span-2 mt-4 sm:mt-8 pt-6 sm:pt-10 border-t-[2px] sm:border-t-[3px] border-black border-dashed flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="flex flex-col flex-1 w-full min-h-[50px] sm:min-h-[60px]">
                {error && (
                  <div className="text-black bg-red-400 px-4 py-3 sm:px-6 sm:py-4 rounded-[0.75rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-xs sm:text-sm flex items-center">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="text-black bg-green-400 px-4 py-3 sm:px-6 sm:py-4 rounded-[0.75rem] sm:rounded-[1.25rem] border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-xs sm:text-sm flex items-center">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 shrink-0" /> {success}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto inline-flex justify-center items-center px-8 py-4 sm:px-12 sm:py-5 bg-black text-white rounded-[1rem] sm:rounded-[1.5rem] font-black text-lg sm:text-xl shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] sm:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(255,107,87,1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-all duration-200 disabled:opacity-50 border-[2px] sm:border-[3px] border-black"
              >
                <Save className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Integrations Card */}
      {(userData?.role === 'teacher' || userData?.role === 'student') && (
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black p-6 sm:p-12 overflow-hidden relative group">
          <div className="absolute -right-12 -bottom-12 sm:-right-16 sm:-bottom-16 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
             <Globe className="h-48 w-48 sm:h-72 sm:w-72 text-black" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black text-black mb-8 sm:mb-10 flex items-center">
              <div className="bg-[#FF6B57] p-2 sm:p-3 rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mr-3 sm:mr-5">
                <ExternalLink className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
              </div>
              Connected Apps
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-white border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all gap-6 sm:gap-8">
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-8">
                  <div className="p-4 sm:p-5 bg-[#FAFAFA] rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
                    <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="h-8 w-8 sm:h-12 sm:w-12" alt="Google" />
                  </div>
                  <div>
                    <h4 className="font-black text-xl sm:text-2xl text-black">Google Workspace</h4>
                    <p className="font-bold text-gray-500 mt-1 sm:mt-2 max-w-md text-sm sm:text-base">Connect your Google account to enable live classes and Google Meet integration.</p>
                  </div>
                </div>
                
                {isGoogleLinked ? (
                  <div className="flex items-center text-black font-black bg-green-400 px-6 py-3 sm:px-8 sm:py-4 rounded-[1rem] sm:rounded-[1.5rem] border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-base sm:text-lg uppercase tracking-widest w-full sm:w-auto justify-center">
                    <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7 mr-2 sm:mr-3" />
                    Linked
                  </div>
                ) : (
                  <button
                    onClick={linkGoogle}
                    className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 bg-white border-[2px] sm:border-[3px] border-black text-black rounded-[1rem] sm:rounded-[1.5rem] font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF6B57] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-lg sm:text-xl"
                  >
                    Connect Google
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
