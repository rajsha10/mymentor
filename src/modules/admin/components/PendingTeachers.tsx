import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

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
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-black">Pending Teacher Approvals</h2>
      {teachers.length === 0 ? (
        <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
          <p className="text-xl font-bold text-gray-500 uppercase tracking-widest">No pending approvals.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <ul className="divide-y-2 divide-black">
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#FFF9C4] transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-14 w-14 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                      {teacher.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-5">
                      <h3 className="text-xl font-extrabold text-black leading-tight">{teacher.name}</h3>
                      <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">{teacher.email}</p>
                      <p className="text-sm font-black text-black mt-2 bg-[#FAFAFA] px-3 py-1 inline-block border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide">
                        Subject: {teacher.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <button
                      onClick={() => handleApprove(teacher.id)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black bg-green-400 hover:bg-green-500 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(teacher.id)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
