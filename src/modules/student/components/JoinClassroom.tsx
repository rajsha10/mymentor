import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, updateDoc, doc, arrayUnion
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Sparkles, BookOpen, Search, Hash } from 'lucide-react';

type Classroom = {
  id: string;
  classroomId: string;
  name: string;
  subject: string;
  teacherName: string;
  description?: string;
  students?: { uid: string }[];
  pendingRequests?: { uid: string }[];
};

export default function JoinClassroom({ onJoined }: { onJoined: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'public' | 'private'>('public');

  // -- Public browse state --
  const [publicClassrooms, setPublicClassrooms] = useState<Classroom[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // -- Private code state --
  const [classCode, setClassCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  // -- Shared feedback --
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (mode !== 'public' || !user) return;
    setBrowseLoading(true);
    setError('');
    const q = query(
      collection(db, 'classrooms'),
      where('visibility', '==', 'public')
    );
    getDocs(q)
      .then(snap => {
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() })) as Classroom[];
        all.sort((a, b) => a.name.localeCompare(b.name));
        // Filter out classrooms the student is already in or pending
        setPublicClassrooms(
          all.filter(c =>
            !c.students?.some(s => s.uid === user.uid) &&
            !c.pendingRequests?.some(s => s.uid === user.uid)
          )
        );
      })
      .catch(() => setError('Failed to load public classrooms.'))
      .finally(() => setBrowseLoading(false));
  }, [mode, user]);

  const handleJoinPublic = async (classroom: Classroom) => {
    if (!user) return;
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'classrooms', classroom.id), {
        pendingRequests: arrayUnion({ uid: user.uid, timestamp: new Date().toISOString() })
      });
      setSuccess(`Join request sent! Waiting for ${classroom.teacherName || 'teacher'} to approve.`);
      onJoined();
    } catch {
      setError('Failed to join classroom. Please try again.');
    }
  };

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCodeLoading(true);
    setError('');
    setSuccess('');
    try {
      const q = query(
        collection(db, 'classrooms'),
        where('classroomId', '==', classCode.toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('Classroom not found. Please check the code.');
        return;
      }
      const classroomDoc = snap.docs[0];
      const data = classroomDoc.data();
      if (data.students?.some((s: any) => s.uid === user.uid)) {
        setError('You are already a member of this classroom.');
        return;
      }
      if (data.pendingRequests?.some((s: any) => s.uid === user.uid)) {
        setError('Your request is already pending approval.');
        return;
      }
      await updateDoc(doc(db, 'classrooms', classroomDoc.id), {
        pendingRequests: arrayUnion({ uid: user.uid, timestamp: new Date().toISOString() })
      });
      setSuccess(`Join request sent! Waiting for ${data.teacherName || 'teacher'} to approve.`);
      setClassCode('');
      onJoined();
    } catch {
      setError('Failed to join classroom. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const filtered = publicClassrooms.filter(c =>
    !searchQuery ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-black text-black uppercase tracking-tight mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#FF6B57]" />
        Join a Classroom
      </h2>

      {/* Mode toggle */}
      <div className="flex rounded-xl border-2 border-black overflow-hidden mb-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => { setMode('public'); setError(''); setSuccess(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all ${
            mode === 'public' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Browse Public
        </button>
        <button
          onClick={() => { setMode('private'); setError(''); setSuccess(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-l-2 border-black ${
            mode === 'private' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Hash className="h-3.5 w-3.5" />
          Enter Code
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {success}
        </div>
      )}

      {/* ── Public browse ── */}
      {mode === 'public' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF6B57] bg-[#FAFAFA] transition-all"
            />
          </div>

          {browseLoading ? (
            <div className="py-8 text-center text-xs font-black uppercase text-gray-400 tracking-widest">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-black uppercase text-gray-400 tracking-widest">
              {searchQuery ? 'No matches found' : 'No public classrooms available'}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 bg-white border-2 border-black rounded-xl hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-9 h-9 shrink-0 bg-[#FF6B57]/10 border-2 border-black rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs uppercase tracking-tight truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">{c.subject}</p>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(c)}
                    className="shrink-0 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase rounded-lg border-2 border-black hover:bg-[#FF6B57] hover:text-black transition-all shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Private code entry ── */}
      {mode === 'private' && (
        <form onSubmit={handleJoinPrivate} className="flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Get the class code from your teacher.
          </p>
          <input
            type="text"
            required
            placeholder="CODE (e.g. PHY9K2X)"
            className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:border-[#FF6B57] transition-all bg-[#FAFAFA] placeholder-gray-400 uppercase font-black tracking-widest text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
          />
          <button
            type="submit"
            disabled={codeLoading || !classCode}
            className="w-full inline-flex items-center justify-center px-8 py-5 border-4 border-black text-sm font-black uppercase tracking-[0.2em] rounded-[1.5rem] text-white bg-black hover:bg-[#FF6B57] hover:text-black focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            {codeLoading ? 'Sending...' : 'SEND REQUEST'}
          </button>
        </form>
      )}
    </div>
  );
}
