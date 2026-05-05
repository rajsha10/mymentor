import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Link } from 'react-router-dom';
import { BookOpen, Users, ArrowRight, Trash2, Search, GraduationCap } from 'lucide-react';

export default function ClassroomsPanel() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredClassrooms = classrooms.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.classroomId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black">Classrooms</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage learning environments</p>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredClassrooms.map((classroom) => (
          <div 
            key={classroom.id} 
            className="bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full overflow-hidden group"
          >
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="h-10 w-10 rounded-xl border-2 border-black bg-[#E8F5E9] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#FF6B57] group-hover:text-white transition-colors">
                  <GraduationCap size={20} className="text-black group-hover:text-white transition-colors" />
                </div>
                <span className="inline-flex items-center px-3 py-1 border-2 border-black rounded-lg text-[9px] font-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] uppercase tracking-widest">
                  ID: {classroom.classroomId}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 mb-6">
                <h3 className="text-xl font-black text-black leading-tight mb-1 group-hover:text-[#FF6B57] transition-colors truncate">{classroom.name}</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <BookOpen size={14} className="mr-1.5 text-black" />
                  {classroom.subject}
                </p>
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#FAFAFA] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center">
                    <Users size={16} className="mr-2 text-[#FF6B57]" />
                    <span className="font-black text-base">{classroom.students?.length || 0}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Enrolled</span>
                </div>
                
                <div className="flex gap-2">
                  <Link
                    to={`/classroom/${classroom.id}`}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-black hover:bg-[#FF6B57] transition-all uppercase tracking-widest text-[10px] group/btn"
                  >
                    Enter
                    <ArrowRight className="ml-1.5 h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                  <button
                    onClick={() => handleDelete(classroom.id)}
                    className="inline-flex justify-center items-center px-4 py-2 border-2 border-black font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 transition-all text-[10px]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-[#FF6B57] border-t-2 border-black group-hover:h-2 transition-all"></div>
          </div>
        ))}
      </div>

      {filteredClassrooms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No active sessions</p>
        </div>
      )}
    </div>
  );
}
