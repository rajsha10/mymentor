import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function JoinClassroom({ onJoined }: { onJoined: () => void }) {
  const { user } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const q = query(collection(db, 'classrooms'), where('classroomId', '==', classCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Classroom not found. Please check the code.');
        setLoading(false);
        return;
      }
      
      const classroomDoc = querySnapshot.docs[0];
      const classroomData = classroomDoc.data();
      
      // Check if already in students or pending
      const isStudent = classroomData.students?.some((s: any) => s.uid === user.uid);
      const isPending = classroomData.pendingRequests?.some((s: any) => s.uid === user.uid);
      
      if (isStudent) {
        setError('You are already a member of this classroom.');
        setLoading(false);
        return;
      }
      
      if (isPending) {
        setError('Your request to join is already pending approval.');
        setLoading(false);
        return;
      }
      
      // Add to pending requests
      await updateDoc(doc(db, 'classrooms', classroomDoc.id), {
        pendingRequests: arrayUnion({
          uid: user.uid,
          timestamp: new Date().toISOString()
        })
      });
      
      setSuccess(`Join request sent! Waiting for ${classroomData.teacherName || 'teacher'} to approve.`);
      setClassCode('');
      onJoined();
    } catch (err: any) {
      console.error("Error joining classroom:", err);
      setError('Failed to join classroom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-black text-black uppercase tracking-tight mb-4 flex items-center gap-2">
         <Sparkles className="h-5 w-5 text-[#FF6B57]" />
         Join a Classroom
      </h2>
      
      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {success}
        </div>
      )}

      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div className="relative group">
          <input
            type="text"
            required
            placeholder="CODE (e.g. PHY9K2X)"
            className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-[#FAFAFA] placeholder-gray-400 uppercase font-black tracking-widest text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !classCode}
          className="w-full inline-flex items-center justify-center px-8 py-5 border-4 border-black text-sm font-black uppercase tracking-[0.2em] rounded-[1.5rem] text-white bg-black hover:bg-[#FF6B57] hover:text-black focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          {loading ? 'Joining...' : 'SEND REQUEST'}
        </button>
      </form>
    </div>
  );
}
