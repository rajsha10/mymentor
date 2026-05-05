import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { UserMinus, Move, Search, Mail, Hash, Layers, X, Check } from 'lucide-react';

export default function StudentsPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [transferringStudent, setTransferringStudent] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qClass = query(collection(db, 'classrooms'));
    getDocs(qClass).then(snap => {
      setClassrooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleRemove = async (student: any) => {
    if (window.confirm(`Are you sure you want to remove ${student.name}?`)) {
      try {
        await deleteDoc(doc(db, 'users', student.id));
        await sendAdminNotification(
          'Student Removed',
          `Student ${student.name} was removed from the platform.`,
          'student_removed'
        );
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const handleTransfer = async (classroomId: string) => {
    if (!transferringStudent || !classroomId) return;
    
    try {
      const newClassRef = doc(db, 'classrooms', classroomId);
      await updateDoc(newClassRef, {
        students: arrayUnion({
          uid: transferringStudent.id,
          timestamp: new Date().toISOString()
        })
      });

      await sendAdminNotification(
        'Student Transferred',
        `Student ${transferringStudent.name} was added to ${classrooms.find(c => c.id === classroomId)?.name}.`,
        'student_transferred',
        { studentId: transferringStudent.id, classroomId }
      );

      setTransferringStudent(null);
      alert("Student added successfully.");
    } catch (error) {
      console.error("Error transferring:", error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black">Student Database</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Global management</p>
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

      {transferringStudent && (
        <div className="bg-[#FFF9C4] p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-black uppercase tracking-tight">Assign {transferringStudent.name}</h3>
            <button onClick={() => setTransferringStudent(null)} className="p-1 border-2 border-black rounded-lg bg-white">
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <Layers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl font-black text-xs focus:outline-none focus:ring-0 focus:border-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] appearance-none cursor-pointer"
              onChange={(e) => handleTransfer(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Select target classroom...</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredStudents.map((student) => (
          <div 
            key={student.id}
            className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:-translate-y-0.5 transition-all"
          >
            <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl overflow-hidden">
                  <div className="w-full h-full bg-[#E3F2FD] flex items-center justify-center border-b-2 border-black">
                    {student.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-black leading-none">{student.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div className="flex items-center text-[11px] text-gray-400 font-bold">
                      <Mail size={12} className="mr-1.5 text-black" />
                      {student.email}
                    </div>
                    <div className="flex items-center text-[11px] text-gray-400 font-bold">
                      <Hash size={12} className="mr-1.5 text-black" />
                      {student.rollNumber || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="bg-black text-white px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 border-black">
                      Grade {student.class || '?'}-{student.section || '?'}
                    </span>
                    <span className="flex items-center bg-[#E8F5E9] border-2 border-black px-2 py-1 rounded-lg font-black text-[8px] uppercase text-green-700">
                      <Check size={10} className="mr-1" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setTransferringStudent(student)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black bg-white hover:bg-gray-50 active:shadow-none transition-all uppercase tracking-widest text-[10px]"
                >
                  <Move className="h-3.5 w-3.5 mr-2" />
                  Assign
                </button>
                <button
                  onClick={() => handleRemove(student)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 active:shadow-none transition-all uppercase tracking-widest text-[10px]"
                >
                  <UserMinus className="h-3.5 w-3.5 mr-2" />
                  Expel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No students found</p>
        </div>
      )}
    </div>
  );
}
