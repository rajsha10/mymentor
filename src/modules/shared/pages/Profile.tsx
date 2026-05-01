import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { linkWithPopup, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { db, googleProvider } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Mail, Shield, Globe, CheckCircle, AlertCircle, Save, Hash, Users } from 'lucide-react';

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const linkGoogle = async () => {
    if (!user) return;
    try {
      const auth = getAuth();
      await linkWithPopup(user, googleProvider);
      
      // Update Firestore to mark Google as connected
      await updateDoc(doc(db, 'users', user.uid), {
        googleConnected: true
      });
      
      setSuccess('Google account linked successfully! You can now use Google Meet functions.');
    } catch (err: any) {
      setError("Failed to link Google account: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 p-6 sm:p-12">
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-[#FF6B57] p-10 border-b-2 border-black relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <Shield className="h-40 w-40 text-black" />
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-6 sm:space-y-0 sm:space-x-8 relative z-10">
            <div className="h-32 w-32 rounded-[2rem] border-4 border-black bg-white flex items-center justify-center text-black text-6xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {userData?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight">{userData?.name}</h1>
              <p className="mt-2 text-black bg-white px-4 py-1.5 inline-block rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-extrabold uppercase tracking-widest text-sm">
                {userData?.role} • {userData?.designation || 'Staff'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 bg-[#FAFAFA]">
          <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                <User className="h-5 w-5 mr-3" /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 rounded-[1rem] border-2 border-black focus:ring-0 focus:border-[#FF6B57] transition-colors outline-none font-bold text-lg bg-white shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                <Mail className="h-5 w-5 mr-3" /> Email Address
              </label>
              <input
                type="text"
                value={user?.email || ''}
                readOnly
                className="w-full px-5 py-4 rounded-[1rem] border-2 border-black bg-gray-100 text-gray-500 outline-none font-bold text-lg cursor-not-allowed"
              />
            </div>
            {userData?.role === 'teacher' && (
              <div className="space-y-3">
                <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                  <Shield className="h-5 w-5 mr-3" /> Assigned Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-5 py-4 rounded-[1rem] border-2 border-black focus:ring-0 focus:border-[#FF6B57] transition-colors outline-none font-bold text-lg bg-white shadow-sm"
                />
              </div>
            )}

            {userData?.role === 'student' && (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                    <Hash className="h-5 w-5 mr-3" /> Class
                  </label>
                  <select
                    className="w-full px-5 py-4 rounded-[1rem] border-2 border-black focus:ring-0 focus:border-[#FF6B57] transition-colors outline-none font-bold text-lg bg-white shadow-sm"
                    value={studentClass}
                    onChange={(e) => {
                      setStudentClass(e.target.value);
                      setSection('');
                    }}
                  >
                    <option value="">Select Class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                    <Globe className="h-5 w-5 mr-3" /> Section / Stream
                  </label>
                  <select
                    className="w-full px-5 py-4 rounded-[1rem] border-2 border-black focus:ring-0 focus:border-[#FF6B57] transition-colors outline-none font-bold text-lg bg-white shadow-sm"
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
                <div className="space-y-3">
                  <label className="text-sm font-black text-black flex items-center uppercase tracking-wider">
                    <Users className="h-5 w-5 mr-3" /> Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-5 py-4 rounded-[1rem] border-2 border-black focus:ring-0 focus:border-[#FF6B57] transition-colors outline-none font-bold text-lg bg-white shadow-sm"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 mt-6 pt-8 border-t-2 border-black border-dashed flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col flex-1 w-full">
                {error && <p className="text-white bg-red-500 px-4 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm flex items-center"><AlertCircle className="h-5 w-5 mr-2" /> {error}</p>}
                {success && <p className="text-black bg-green-400 px-4 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm flex items-center"><CheckCircle className="h-5 w-5 mr-2" /> {success}</p>}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto inline-flex justify-center items-center px-10 py-4 bg-black text-white rounded-full font-extrabold text-lg shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:-translate-y-1 transition-all disabled:opacity-50 border-2 border-black"
              >
                <Save className="h-5 w-5 mr-3" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {(userData?.role === 'teacher' || userData?.role === 'student') && (
        <div className="bg-white rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black p-8 sm:p-12 overflow-hidden relative">
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
             <Globe className="h-64 w-64 text-black" />
          </div>
          <h2 className="text-3xl font-black text-black mb-8 flex items-center relative z-10">
            <Globe className="h-8 w-8 mr-4 text-[#FF6B57]" />
            External Integrations
          </h2>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-8 rounded-[1.5rem] bg-[#FAFAFA] border-2 border-black shadow-sm gap-6 relative z-10">
            <div className="flex items-center space-x-6">
              <div className="p-4 bg-white rounded-[1rem] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="h-10 w-10" alt="Google" />
              </div>
              <div>
                <p className="font-extrabold text-xl text-black">Google Workspace</p>
                <p className="font-bold text-gray-500 mt-1">Required for live classes via Google Meet.</p>
              </div>
            </div>
            
            {isGoogleLinked ? (
              <div className="flex items-center text-black font-black bg-green-400 px-6 py-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg uppercase tracking-wider w-full sm:w-auto justify-center">
                <CheckCircle className="h-6 w-6 mr-3" />
                Connected
              </div>
            ) : (
              <button
                onClick={linkGoogle}
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-black text-black rounded-full font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-lg"
              >
                Connect Google Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
