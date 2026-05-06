import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Link } from 'react-router-dom';
import { BookOpen, Users, ArrowRight, Trash2, Search, GraduationCap, Plus, X } from 'lucide-react';
import { createClassroomBots } from '../../../services/backendApi';

export default function ClassroomsPanel() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'classrooms')), (snapshot) => {
      setClassrooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'), where('approved', '==', true)))
      .then(snap => setTeachers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'classrooms', id));
      } catch (error) {
        console.error('Error deleting classroom:', error);
      }
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setDescription('');
    setVisibility('public');
    setSelectedTeacherId('');
    setCreateError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setCreateError('Please select a teacher.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const classroomId = Math.random().toString(36).substring(2, 9).toUpperCase();
      const teacher = teachers.find(t => t.uid === selectedTeacherId);

      await addDoc(collection(db, 'classrooms'), {
        classroomId,
        name,
        subject,
        description,
        visibility,
        teacherId: selectedTeacherId,
        teacherName: teacher?.name || 'Faculty',
        students: [],
        pendingRequests: [],
        meetingActive: false,
        meetingStartTime: null,
        meetingLink: '',
        createdAt: serverTimestamp(),
      });

      try {
        await createClassroomBots(classroomId, name);
      } catch (err) {
        console.warn('Could not create classroom bots (backend may be offline):', err);
      }

      resetForm();
      setShowCreate(false);
    } catch (err) {
      console.error('Error creating classroom:', err);
      setCreateError('Failed to create classroom. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filteredClassrooms = classrooms.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.classroomId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = 'w-full px-4 py-2.5 border-2 border-black rounded-xl focus:outline-none focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400 text-sm font-medium';
  const labelClass = 'block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black">Classrooms</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage learning environments</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black group-focus-within:text-[#FF6B57] transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-sm bg-white focus:outline-none focus:border-[#FF6B57] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); resetForm(); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] hover:text-black transition-all whitespace-nowrap"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? 'Cancel' : 'New Classroom'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="text-lg font-black text-black mb-5">Create New Classroom</h3>
          {createError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border-2 border-red-500 rounded-xl text-sm font-medium text-red-600">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Class Name</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  placeholder="e.g. Physics 101"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Subject</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  placeholder="e.g. Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Assign Teacher</label>
              <select
                required
                className={inputClass}
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <option value="">Select a teacher…</option>
                {teachers.map(t => (
                  <option key={t.uid} value={t.uid}>
                    {t.name} {t.subject ? `— ${t.subject}` : ''}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p className="mt-1 text-xs text-gray-400 font-medium">No approved teachers found.</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                placeholder="Briefly describe what this class is about..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Visibility</label>
              <select
                className={inputClass}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-black text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating…' : 'Create Classroom'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-6 py-2.5 bg-white text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classroom grid */}
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
                {classroom.teacherName && (
                  <p className="text-xs font-bold text-gray-400 mt-1">Teacher: {classroom.teacherName}</p>
                )}
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
            <div className="h-1.5 bg-[#FF6B57] border-t-2 border-black group-hover:h-2 transition-all" />
          </div>
        ))}
      </div>

      {filteredClassrooms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed">
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No classrooms found</p>
        </div>
      )}
    </div>
  );
}
