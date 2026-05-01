import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { UserMinus, ShieldAlert, Search } from 'lucide-react';

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black text-black">Teachers Management</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search teachers..."
            className="w-full sm:w-80 pl-12 pr-6 py-3 border-2 border-black rounded-full font-bold bg-[#FAFAFA] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <ul className="divide-y-2 divide-black">
          {filteredTeachers.map((teacher) => (
            <li key={teacher.id}>
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#FAFAFA] transition-colors gap-4 sm:gap-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-14 w-14 rounded-full border-2 border-black bg-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                    {teacher.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-extrabold text-black leading-none">{teacher.name}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">{teacher.email}</p>
                    <div className="flex items-center mt-3 space-x-3">
                      <span className="text-xs bg-black text-white px-3 py-1 rounded-full font-bold uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                        {teacher.subject}
                      </span>
                      <select
                        value={teacher.designation || 'teacher'}
                        onChange={(e) => updateDesignation(teacher.id, e.target.value)}
                        className="text-xs border-2 border-black bg-white text-black rounded-full py-1 px-3 font-extrabold uppercase focus:outline-none focus:ring-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="subject_coordinator">Coordinator</option>
                        <option value="head_teacher">Head Teacher</option>
                        <option value="headmaster">Headmaster</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleRemove(teacher)}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 transition-all uppercase tracking-wider text-sm"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
