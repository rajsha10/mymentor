import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { Trash2, Download, ExternalLink, BookOpen, Plus, Clock, Loader, Calendar, CheckCircle2, PlusCircle, Users, ArrowRight } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { downloadFile, openFile } from '../../../utils/downloadHelper';
import { getClassroomBot, addDocument as addDocumentToBot } from '../../../services/backendApi';

export default function Homework({ classroomId, isTeacher }: { classroomId: string, isTeacher: boolean }) {
  const { user, userData } = useAuth();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Create Homework State
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Submit Homework State
  const [selectedHomework, setSelectedHomework] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, `classrooms/${classroomId}/homework`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hw = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHomeworks(hw);
    });

    return () => unsubscribe();
  }, [classroomId]);

  useEffect(() => {
    if (!user && !isTeacher) return;
    
    const q = isTeacher 
      ? query(collection(db, `classrooms/${classroomId}/homeworkSubmissions`))
      : query(collection(db, `classrooms/${classroomId}/homeworkSubmissions`), where('studentId', '==', user?.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubmissions(subs);
    });

    return () => unsubscribe();
  }, [classroomId, isTeacher, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      let fileUrl = '';
      if (file) {
        fileUrl = await uploadFile(file, 'homework_briefs');
      }

      await addDoc(collection(db, `classrooms/${classroomId}/homework`), {
        title,
        description,
        dueDate: dueDate || null,
        teacherId: user.uid,
        fileUrl,
        timestamp: serverTimestamp()
      });

      // Auto-feed the PDF brief into the homework bot
      if (file) {
        try {
          const bot = await getClassroomBot(classroomId, 'homework');
          if (bot) {
            await addDocumentToBot(bot.agent_id, file);
          }
        } catch (err) {
          console.warn('Could not feed homework PDF into bot:', err);
        }
      }

      // Send Notification
      await sendNotification(
        classroomId,
        'New Homework Assigned',
        `${title}: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
        'homework_posted'
      );

      setTitle('');
      setDescription('');
      setDueDate('');
      setFile(null);
      setShowCreate(false);
    } catch (error) {
      console.error("Error creating homework:", error);
      alert("Failed to create homework.");
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (hwId: string) => {
    if (!window.confirm("Are you sure you want to delete this homework?")) return;
    try {
      await deleteDoc(doc(db, `classrooms/${classroomId}/homework`, hwId));
    } catch (error) {
      console.error("Error deleting homework:", error);
      alert("Failed to delete homework.");
    }
  };

  const handleSubmit = async (e: React.FormEvent, hwId: string) => {
    e.preventDefault();
    if (!file || !user) return;

    setSubmitLoading(true);
    try {
      const cloudinaryUrl = await uploadFile(file, 'homework_submissions');


      await addDoc(collection(db, `classrooms/${classroomId}/homeworkSubmissions`), {
        homeworkId: hwId,
        studentId: user.uid,
        studentName: userData?.name || 'Unknown Student',
        rollNumber: userData?.rollNumber || 'N/A',
        cloudinaryUrl,
        submittedAt: serverTimestamp()
      });

      // Send Notification
      await sendNotification(
        classroomId,
        'Homework Submitted',
        `${userData?.name || 'A student'} submitted homework.`,
        'homework_submitted'
      );
      
      setFile(null);
      setSelectedHomework(null);
    } catch (error) {
      console.error("Error submitting homework:", error);
      alert("Failed to submit homework.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const hasSubmitted = (hwId: string) => {
    return submissions.some(sub => sub.homeworkId === hwId && sub.studentId === user?.uid);
  };

  const getSubmissionsForHomework = (hwId: string) => {
    return submissions.filter(sub => sub.homeworkId === hwId);
  };

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-10">
      {isTeacher && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-black uppercase tracking-tight">Homework</h3>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
              showCreate ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]'
            }`}
          >
            {showCreate ? 'Close Form' : 'Create Homework'}
          </button>
        </div>
      )}

      {showCreate && isTeacher && (
        <div className="bg-[#FAFAFA] p-6 sm:p-10 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Title</label>
              <input
                type="text"
                required
                className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg placeholder-gray-300 shadow-inner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Topic of Homework"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Description</label>
              <textarea
                className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the homework..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Due Date (Optional)</label>
                <div className="relative">
                   <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                   <input
                    type="datetime-local"
                    className="w-full pl-16 pr-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner appearance-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Instructions / Brief (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="w-full block text-sm text-black border-4 border-black rounded-[1.5rem] bg-white px-6 py-5 file:mr-6 file:py-2.5 file:px-6 file:rounded-xl file:border-2 file:border-black file:text-xs file:font-black file:bg-[#FF6B57] file:text-black hover:file:bg-black hover:file:text-white transition-all cursor-pointer"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group flex items-center gap-3 bg-[#FF6B57] text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
              >
                {loading ? <Loader className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                <span>{loading ? 'Creating...' : 'Assign Homework'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-10">
        {homeworks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-black border-dashed opacity-60">
             <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-8">
               <BookOpen className="h-12 w-12 text-gray-300" />
             </div>
             <p className="text-2xl font-black text-black uppercase tracking-tight mb-2">No homework assigned yet</p>
             <p className="text-gray-400 font-bold uppercase tracking-wide text-sm">New tasks will appear here.</p>
          </div>
        ) : (
          homeworks.map((hw) => (
            <div key={hw.id} className="bg-white rounded-[3rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1">
              <div className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-3 truncate">{hw.title}</h4>
                    <div className="flex flex-wrap items-center gap-4">
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-2 border-black rounded-xl">
                          <Calendar className="h-4 w-4 text-[#FF6B57]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-black">
                            Posted {hw.timestamp?.toDate ? format(hw.timestamp.toDate(), 'MMM d') : ''}
                          </span>
                       </div>
                       {hw.dueDate && (
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border-2 border-black rounded-xl">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                               Due: {format(new Date(hw.dueDate), 'MMM d, h:mm a')}
                            </span>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="w-12 h-12 bg-red-500 text-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-colors"
                        title="Delete Homework"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    )}
                    {!isTeacher && (
                      hasSubmitted(hw.id) ? (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <CheckCircle2 className="h-4 w-4" />
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-amber-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <Clock className="h-4 w-4" />
                          Pending
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-gray-50/50 p-6 sm:p-8 rounded-[2rem] border-2 border-black/5 mb-8">
                   <p className="text-black text-lg font-bold whitespace-pre-wrap leading-relaxed">{hw.description}</p>
                </div>
                
                {hw.fileUrl && (
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <button 
                      onClick={() => openFile(hw.fileUrl)}
                      className="group inline-flex items-center px-6 py-3.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF6B57] transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Brief
                    </button>
                    <button 
                      onClick={() => downloadFile(hw.fileUrl, `brief_${hw.title}`)}
                      className="group inline-flex items-center px-6 py-3.5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                      Download PDF
                    </button>
                  </div>
                )}

                
                {!isTeacher && !hasSubmitted(hw.id) && (
                  <div className="pt-8 border-t-4 border-black border-dashed">
                    {selectedHomework === hw.id ? (
                      <form onSubmit={(e) => handleSubmit(e, hw.id)} className="space-y-6 bg-gray-50 p-8 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-300">
                        <div className="flex flex-col gap-4">
                           <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Upload Submission (PDF)</label>
                           <input
                            type="file"
                            accept=".pdf"
                            required
                            className="w-full text-sm text-black border-4 border-black rounded-[1.5rem] bg-white px-6 py-5 file:mr-6 file:py-2.5 file:px-6 file:rounded-xl file:border-2 file:border-black file:text-xs file:font-black file:bg-[#FF6B57] file:text-black file:uppercase file:tracking-widest hover:file:bg-black hover:file:text-white cursor-pointer"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="submit"
                            disabled={submitLoading || !file}
                            className="flex-1 bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-30"
                          >
                            {submitLoading ? 'SUBMITTING...' : 'UPLOAD WORK'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedHomework(null); setFile(null); }}
                            className="px-8 py-4 text-black font-black uppercase tracking-widest rounded-2xl border-4 border-transparent hover:border-black transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setSelectedHomework(hw.id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#FF6B57] text-black px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                      >
                        <PlusCircle className="h-6 w-6" />
                        SUBMIT HOMEWORK
                      </button>
                    )}
                  </div>
                )}

                {!isTeacher && hasSubmitted(hw.id) && (
                  <div className="pt-8 border-t-4 border-black border-dashed">
                    {(() => {
                      const sub = submissions.find(s => s.homeworkId === hw.id && s.studentId === user?.uid);
                      if (!sub) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-4">
                          <button 
                            onClick={() => openFile(sub.cloudinaryUrl)}
                            className="bg-black text-white text-xs font-black uppercase tracking-widest flex items-center px-8 py-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                          >
                            <ExternalLink className="h-5 w-5 mr-3 text-[#FF6B57]" />
                            MY SUBMISSION
                          </button>
                          <button 
                            onClick={() => downloadFile(sub.cloudinaryUrl, `my_homework_${hw.title}`)}
                            className="bg-white text-black text-xs font-black uppercase tracking-widest flex items-center px-8 py-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                          >
                            <Download className="h-5 w-5 mr-3" />
                            DOWNLOAD
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}


                {isTeacher && (
                  <div className="mt-10 pt-10 border-t-4 border-black">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                          <Users className="h-5 w-5 text-white" />
                       </div>
                       <h5 className="text-2xl font-black text-black uppercase tracking-tight">
                         Submissions ({getSubmissionsForHomework(hw.id).length})
                       </h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {getSubmissionsForHomework(hw.id).length === 0 ? (
                        <div className="col-span-full py-12 border-4 border-dashed border-black/5 rounded-3xl text-center">
                           <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No submissions received yet.</p>
                        </div>
                      ) : (
                        getSubmissionsForHomework(hw.id).map(sub => (
                          <div key={sub.id} className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)] transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                               <p className="text-lg font-black text-black uppercase tracking-tight truncate">{sub.studentName || 'Student'}</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Roll: {sub.rollNumber || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => openFile(sub.cloudinaryUrl)}
                                className="w-10 h-10 bg-white text-black border-2 border-black rounded-xl flex items-center justify-center hover:bg-[#FF6B57] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                                title="View"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => downloadFile(sub.cloudinaryUrl, `submission_${sub.studentName || 'user'}`)}
                                className="w-10 h-10 bg-black text-white border-2 border-black rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
