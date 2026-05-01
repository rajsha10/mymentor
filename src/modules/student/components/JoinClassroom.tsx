import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

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
    <div>
      <h2 className="text-2xl font-extrabold text-black mb-6">Join a Classroom</h2>
      {error && <div className="mb-6 bg-[#FF6B57] text-white p-4 rounded-2xl font-medium border border-black">{error}</div>}
      {success && <div className="mb-6 bg-[#FAFAFA] text-black p-4 rounded-2xl font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{success}</div>}
      <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            required
            placeholder="Enter Class Code (e.g., PHY9K2X)"
            className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400 uppercase font-bold tracking-widest text-center sm:text-left"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !classCode}
          className="inline-flex items-center justify-center px-8 py-4 border-2 border-black text-lg font-bold rounded-full text-white bg-black hover:bg-gray-800 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}
