import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default function RoleAssignment() {
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'teacher'),
      where('approved', '==', true)
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

  const handleRoleChange = async (id: string, newDesignation: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        designation: newDesignation
      });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const roles = ['teacher', 'subject_coordinator', 'head_teacher', 'headmaster'];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-black">Role Assignment</h2>
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <ul className="divide-y-2 divide-black">
          {teachers.map((teacher) => (
            <li key={teacher.id}>
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#FAFAFA] transition-colors gap-4 sm:gap-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-14 w-14 rounded-full border-2 border-black bg-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                    {teacher.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-extrabold text-black leading-tight">{teacher.name}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest hidden sm:inline-block">
                    Current: <span className="font-black text-black ml-1">{teacher.designation || 'teacher'}</span>
                  </span>
                  <select
                    className="w-full sm:w-auto bg-white border-2 border-black rounded-full px-5 py-3 font-extrabold focus:outline-none focus:ring-0 focus:border-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black uppercase tracking-wider text-sm cursor-pointer"
                    value={teacher.designation || 'teacher'}
                    onChange={(e) => handleRoleChange(teacher.id, e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role} value={role} className="font-extrabold">{role.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
