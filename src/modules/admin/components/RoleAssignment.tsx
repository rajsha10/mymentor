import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Shield, Mail, UserCheck, ChevronDown } from 'lucide-react';

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div>
        <h2 className="text-2xl font-black text-black">Hierarchy Control</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Assign roles</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {teachers.map((teacher) => (
          <div 
            key={teacher.id}
            className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:-translate-y-0.5 transition-all"
          >
            <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-xl border-2 border-black bg-black text-white shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] flex items-center justify-center font-black text-xl">
                  {teacher.name?.charAt(0).toUpperCase()}
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-black leading-none">{teacher.name}</h3>
                  <div className="flex items-center text-[11px] text-gray-400 font-bold pt-1">
                    <Mail size={12} className="mr-1.5 text-black" />
                    {teacher.email}
                  </div>
                  <div className="pt-2">
                    <span className="bg-[#FFF9C4] border-2 border-black px-2.5 py-1 rounded-lg font-black text-[9px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center">
                      <Shield size={10} className="mr-1.5" />
                      {teacher.designation?.replace('_', ' ') || 'TEACHER'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-56">
                  <select
                    className="w-full bg-white border-2 border-black rounded-xl px-4 py-2 font-black text-xs focus:outline-none focus:ring-0 focus:border-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black uppercase tracking-widest cursor-pointer appearance-none hover:bg-gray-50 transition-colors"
                    value={teacher.designation || 'teacher'}
                    onChange={(e) => handleRoleChange(teacher.id, e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={16} />
                </div>
                
                <div className="hidden lg:flex items-center justify-center h-10 w-10 rounded-full border-2 border-black bg-green-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <UserCheck size={16} className="text-black" />
                </div>
              </div>
            </div>
            <div className="bg-black/5 px-6 py-2 flex items-center justify-between border-t-2 border-black border-dashed">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Clearance Verified</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
