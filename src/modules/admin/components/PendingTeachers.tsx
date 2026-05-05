import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Check, X, Mail, BookOpen, Clock } from 'lucide-react';

export default function PendingTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'teacher'),
      where('approved', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(teacherData);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        approved: true
      });
    } catch (error) {
      console.error("Error approving teacher:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      console.error("Error rejecting teacher:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div>
        <h2 className="text-2xl font-black text-black">Pending Approvals</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Educator applications</p>
      </div>

      {teachers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No pending applications</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teachers.map((teacher) => (
            <div 
              key={teacher.id}
              className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group"
            >
              <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-xl border-2 border-black bg-[#FFF9C4] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                    {teacher.name?.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-black leading-none">{teacher.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <div className="flex items-center text-[11px] text-gray-400 font-bold">
                        <Mail size={12} className="mr-1.5 text-black" />
                        {teacher.email}
                      </div>
                      <div className="flex items-center text-[11px] text-gray-400 font-bold">
                        <BookOpen size={12} className="mr-1.5 text-black" />
                        {teacher.subject}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(teacher.id)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black bg-green-400 hover:bg-green-500 active:shadow-none transition-all uppercase tracking-widest text-[10px]"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(teacher.id)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 active:shadow-none transition-all uppercase tracking-widest text-[10px]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
