import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { UserMinus, Search, Mail, Book, GraduationCap } from 'lucide-react';

export default function TeachersPanel() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'teacher'),
      where('approved', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleRemove = async (teacher: any) => {
    if (window.confirm(`Are you sure you want to remove ${teacher.name}?`)) {
      try {
        await deleteDoc(doc(db, 'users', teacher.id));
        await sendAdminNotification(
          'Teacher Removed',
          `Teacher ${teacher.name} (${teacher.email}) was removed from the system.`,
          'teacher_removed'
        );
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const updateDesignation = async (uid: string, designation: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { designation });
    } catch (error) {
      console.error("Error updating designation:", error);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black">Teachers Registry</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Verified educators</p>
        </div>
        <div className="relative w-full lg:w-72 group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black group-focus-within:text-[#FF6B57] transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-sm bg-white focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTeachers.map((teacher) => (
          <div 
            key={teacher.id}
            className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:-translate-y-0.5 transition-all"
          >
            <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="h-14 w-14 rounded-xl border-2 border-black bg-[#FF6B57] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white font-black text-xl">
                    {teacher.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-black leading-none">{teacher.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center text-[11px] text-gray-400 font-bold">
                      <Mail size={12} className="mr-1.5" />
                      {teacher.email}
                    </div>
                    <div className="flex items-center text-[11px] text-gray-400 font-bold">
                      <Book size={12} className="mr-1.5" />
                      {teacher.subject}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <select
                      value={teacher.designation || 'teacher'}
                      onChange={(e) => updateDesignation(teacher.id, e.target.value)}
                      className="text-[10px] border-2 border-black bg-white text-black rounded-lg py-1 px-3 font-black uppercase focus:outline-none focus:ring-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="subject_coordinator">Coordinator</option>
                      <option value="head_teacher">Head</option>
                      <option value="headmaster">Headmaster</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleRemove(teacher)}
                className="group relative inline-flex items-center justify-center px-5 py-2 border-2 border-black font-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase tracking-widest text-[10px]"
              >
                <UserMinus className="h-3.5 w-3.5 mr-2" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredTeachers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No educators found</p>
        </div>
      )}
    </div>
  );
}
