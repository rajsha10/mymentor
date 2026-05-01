import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, arrayRemove, arrayUnion, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendAdminNotification } from '../../../services/notificationService';
import { UserMinus, Move, Search } from 'lucide-react';

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
    if (!transferringStudent) return;
    
    try {
      // Find where student currently is (optional, but good for cleanup if moving)
      // For simplicity as per PRD logic, we just ADD to new and user can remove from old.
      // But let's try to be smart if they are in multiple.
      
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
      alert("Student added to classroom successfully.");
    } catch (error) {
      console.error("Error transferring:", error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black text-black">Students Management</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full sm:w-80 pl-12 pr-6 py-3 border-2 border-black rounded-full font-bold bg-[#FAFAFA] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {transferringStudent && (
        <div className="bg-[#FFF9C4] p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-black font-bold text-lg">
            Select a classroom to add <strong className="font-black text-xl bg-[#FF6B57] px-3 py-1 rounded-full border-2 border-black">{transferringStudent.name}</strong> to:
          </p>
          <div className="flex gap-4 w-full md:w-auto flex-col sm:flex-row">
            <select 
              className="flex-1 bg-white border-2 border-black rounded-full px-5 py-3 font-extrabold focus:outline-none focus:ring-0 focus:border-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              onChange={(e) => handleTransfer(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Select Class...</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.classroomId})</option>
              ))}
            </select>
            <button 
              onClick={() => setTransferringStudent(null)} 
              className="bg-white border-2 border-black rounded-full px-6 py-3 font-extrabold text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors uppercase tracking-wider text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <ul className="divide-y-2 divide-black">
          {filteredStudents.map((student) => (
            <li key={student.id}>
              <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#FAFAFA] transition-colors gap-4 md:gap-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-14 w-14 rounded-full border-2 border-black bg-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                    {student.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-extrabold text-black leading-tight">{student.name}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1">{student.email}</p>
                    <p className="text-sm font-black text-black mt-2 bg-[#FAFAFA] px-3 py-1 inline-block border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide">
                      Class {student.class}-{student.section} | Roll: {student.rollNumber}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                  <button
                    onClick={() => setTransferringStudent(student)}
                    className="flex-1 md:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black bg-white hover:bg-gray-50 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Add
                  </button>
                  <button
                    onClick={() => handleRemove(student)}
                    className="flex-1 md:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider"
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
