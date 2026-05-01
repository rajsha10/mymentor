import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Link } from 'react-router-dom';

export default function ClassroomsPanel() {
  const [classrooms, setClassrooms] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'classrooms'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClassrooms(classData);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this classroom? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'classrooms', id));
      } catch (error) {
        console.error("Error deleting classroom:", error);
      }
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-black">Classrooms Management</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <div key={classroom.id} className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full overflow-hidden">
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-2xl font-black text-black truncate leading-tight">{classroom.name}</h3>
                  <p className="mt-2 text-sm font-bold text-gray-500 uppercase tracking-widest truncate">{classroom.subject}</p>
                </div>
                <span className="flex-shrink-0 inline-flex items-center px-4 py-2 border-2 border-black rounded-full text-sm font-black bg-[#FFF9C4] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {classroom.classroomId}
                </span>
              </div>
              <div className="mt-auto pt-6 flex items-center justify-between border-t-2 border-black border-dashed">
                <span className="font-extrabold text-black bg-[#FAFAFA] px-4 py-2 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                  {classroom.students?.length || 0} Students
                </span>
                <div className="space-x-3 flex">
                  <Link
                    to={`/classroom/${classroom.id}`}
                    className="inline-flex justify-center items-center px-4 py-2 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-black hover:bg-gray-800 transition-colors text-sm uppercase tracking-wider"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(classroom.id)}
                    className="inline-flex justify-center items-center px-4 py-2 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 transition-colors text-sm uppercase tracking-wider"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
