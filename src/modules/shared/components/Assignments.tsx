import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getClassroomBot, addDocument as addDocumentToBot } from '../../../services/backendApi';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { Trash2, Download, ExternalLink, ClipboardList, Plus, Trophy, Clock, Loader, Calendar, CheckCircle2, PlusCircle, Users, AlertCircle, ChevronDown } from 'lucide-react';
import { downloadFile, openFile } from '../../../utils/downloadHelper';

export default function Assignments({ classroomId, isTeacher }: { classroomId: string, isTeacher: boolean }) {
  const { user, userData } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Create Assignment State
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [loading, setLoading] = useState(false);

  // Submit Assignment State
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Grading State
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, `classrooms/${classroomId}/assignments`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const asg = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssignments(asg);
    });

    return () => unsubscribe();
  }, [classroomId]);

  useEffect(() => {
    if (!user && !isTeacher) return;
    
    const q = isTeacher 
      ? query(collection(db, `classrooms/${classroomId}/assignmentSubmissions`))
      : query(collection(db, `classrooms/${classroomId}/assignmentSubmissions`), where('studentId', '==', user?.uid));

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
    if (!title.trim() || !user || !deadline) return;

    setLoading(true);
    try {
      let fileUrl = '';
      if (file) {
        fileUrl = await uploadFile(file, 'assignments');
      }

      await addDoc(collection(db, `classrooms/${classroomId}/assignments`), {
        title,
        description,
        deadline,
        totalMarks: Number(totalMarks),
        teacherId: user.uid,
        fileUrl,
        timestamp: serverTimestamp()
      });

      // Auto-feed the reference PDF into the assignments bot
      if (file) {
        try {
          const bot = await getClassroomBot(classroomId, 'assignments');
          if (bot) {
            await addDocumentToBot(bot.agent_id, file);
          }
        } catch (err) {
          console.warn('Could not feed assignment PDF into bot:', err);
        }
      }

      // Send Notification
      await sendNotification(
        classroomId,
        'Project Assignment Posted',
        `New assignment: ${title}. Due: ${format(new Date(deadline), 'MMM d, h:mm a')}`,
        'assignment_posted'
      );

      setTitle('');
      setDescription('');
      setDeadline('');
      setTotalMarks('100');
      setFile(null);
      setShowCreate(false);
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment.");
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (asgId: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await deleteDoc(doc(db, `classrooms/${classroomId}/assignments`, asgId));
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment.");
    }
  };

  const handleSubmit = async (e: React.FormEvent, asgId: string) => {
    e.preventDefault();
    if (!file || !user) return;

    setSubmitLoading(true);
    try {
      const cloudinaryUrl = await uploadFile(file, 'assignment_submissions');

      await addDoc(collection(db, `classrooms/${classroomId}/assignmentSubmissions`), {
        assignmentId: asgId,
        studentId: user.uid,
        studentName: userData?.name || 'Unknown Student',
        rollNumber: userData?.rollNumber || 'N/A',
        cloudinaryUrl,
        marks: null,
        feedback: '',
        submittedAt: serverTimestamp()
      });
      
      // Send Notification
      await sendNotification(
        classroomId,
        'Assignment Submitted',
        `${userData?.name || 'A student'} submitted an assignment.`,
        'assignment_submitted'
      );
      
      setFile(null);
      setSelectedAssignment(null);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment.");
    } finally {
      setSubmitLoading(false);
    }
  };


  const handleGrade = async (e: React.FormEvent, subId: string) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, `classrooms/${classroomId}/assignmentSubmissions`, subId), {
        marks: Number(marks),
        feedback
      });

      // Send Notification
      await sendNotification(
        classroomId,
        'Assignment Graded',
        `Your assignment has been graded: ${marks} marks.`,
        'assignment_graded'
      );

      setGradingSubId(null);
      setMarks('');
      setFeedback('');
    } catch (error) {
      console.error("Error grading submission:", error);
    }
  };

  const hasSubmitted = (asgId: string) => {
    return submissions.some(sub => sub.assignmentId === asgId && sub.studentId === user?.uid);
  };

  const getSubmissionsForAssignment = (asgId: string) => {
    return submissions.filter(sub => sub.assignmentId === asgId);
  };

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-10">
      {isTeacher && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-black uppercase tracking-tight">Assignments</h3>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
              showCreate ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]'
            }`}
          >
            {showCreate ? 'Close Form' : 'Create Assignment'}
          </button>
        </div>
      )}

      {showCreate && isTeacher && (
        <div className="bg-[#FAFAFA] p-6 sm:p-10 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg placeholder-gray-300 shadow-inner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Assignment Title"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Total Marks</label>
                <div className="relative group">
                  <Trophy className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#FF6B57]" />
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full pl-16 pr-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Description</label>
              <textarea
                className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the assignment requirements..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Deadline</label>
                <div className="relative">
                  <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    required
                    className="w-full pl-16 pr-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner appearance-none"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Attachment (PDF Only)</label>
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
                <span>{loading ? 'Creating...' : 'Post Assignment'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-10">
        {assignments.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-black border-dashed opacity-60">
            <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <ClipboardList className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-2xl font-black text-black uppercase tracking-tight mb-2">No assignments yet</p>
            <p className="text-gray-400 font-bold uppercase tracking-wide text-sm">Class assignments will appear here once posted.</p>
          </div>
        ) : (
          assignments.map((asg) => (
            <div key={asg.id} className="bg-white rounded-[3rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1">
              <div className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-3 truncate">{asg.title}</h4>
                    <div className="flex flex-wrap items-center gap-4">
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-2 border-black rounded-xl">
                          <Calendar className="h-4 w-4 text-[#FF6B57]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-black">
                            Due: {format(new Date(asg.deadline), 'MMM d, h:mm a')}
                          </span>
                       </div>
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-2 border-black rounded-xl">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-black">
                             {asg.totalMarks} Marks
                          </span>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(asg.id)}
                        className="w-12 h-12 bg-red-500 text-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-colors"
                        title="Delete Assignment"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    )}
                    {!isTeacher && (
                      hasSubmitted(asg.id) ? (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-amber-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <Clock className="h-4 w-4" />
                          To Do
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-gray-50/50 p-6 sm:p-8 rounded-[2rem] border-2 border-black/5 mb-8">
                   <p className="text-black text-lg font-bold whitespace-pre-wrap leading-relaxed">{asg.description}</p>
                </div>
                
                {asg.fileUrl && (
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <button
                      onClick={() => openFile(asg.fileUrl)}
                      className="group inline-flex items-center px-6 py-3.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF6B57] transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Resource Materials
                    </button>
                    <button
                      onClick={() => downloadFile(asg.fileUrl, `assignment_${asg.title}`)}
                      className="group inline-flex items-center px-6 py-3.5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                      Download PDF
                    </button>
                  </div>
                )}

                
                {!isTeacher && !hasSubmitted(asg.id) && (
                  <div className="pt-8 border-t-4 border-black border-dashed">
                    {selectedAssignment === asg.id ? (
                      <form onSubmit={(e) => handleSubmit(e, asg.id)} className="space-y-6 bg-gray-50 p-8 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-300">
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
                            {submitLoading ? 'SUBMITTING...' : 'TURN IN WORK'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedAssignment(null); setFile(null); }}
                            className="px-8 py-4 text-black font-black uppercase tracking-widest rounded-2xl border-4 border-transparent hover:border-black transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setSelectedAssignment(asg.id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#FF6B57] text-black px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                      >
                        <PlusCircle className="h-6 w-6" />
                        ADD SUBMISSION
                      </button>
                    )}
                  </div>
                )}

                {!isTeacher && hasSubmitted(asg.id) && (
                  <div className="pt-8 border-t-4 border-black border-dashed">
                    {(() => {
                      const mySub = submissions.find(s => s.assignmentId === asg.id && s.studentId === user?.uid);
                      return (
                        <div className="space-y-8">
                          <div className="flex flex-wrap items-center gap-4">
                            <button 
                              onClick={() => openFile(mySub.cloudinaryUrl)}
                              className="bg-black text-white text-xs font-black uppercase tracking-widest flex items-center px-8 py-4 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                            >
                              <ExternalLink className="h-5 w-5 mr-3 text-[#FF6B57]" />
                              MY SUBMISSION
                            </button>
                            <button 
                              onClick={() => downloadFile(mySub.cloudinaryUrl, `my_assignment_${asg.title}`)}
                              className="bg-white text-black text-xs font-black uppercase tracking-widest flex items-center px-8 py-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                            >
                              <Download className="h-5 w-5 mr-3" />
                              DOWNLOAD
                            </button>
                          </div>

                          {mySub?.marks !== null ? (
                            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-4 border-emerald-500 shadow-[10px_10px_0px_0px_rgba(16,185,129,0.1)]">
                               <div className="flex items-center gap-3 mb-4">
                                  <Trophy className="h-6 w-6 text-emerald-600" />
                                  <p className="text-xl font-black text-emerald-950 uppercase tracking-tight">Grade Released</p>
                               </div>
                               <div className="flex items-baseline gap-2 mb-4">
                                  <span className="text-5xl font-black text-emerald-600">{mySub.marks}</span>
                                  <span className="text-xl font-black text-emerald-600/40">/ {asg.totalMarks}</span>
                               </div>
                               {mySub.feedback && (
                                 <div className="mt-4 pt-4 border-t-2 border-emerald-600/10">
                                   <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Teacher Feedback</p>
                                   <p className="text-emerald-900 font-bold leading-relaxed italic">"{mySub.feedback}"</p>
                                 </div>
                               )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 text-amber-700 rounded-2xl border-2 border-amber-200">
                               <Clock className="h-5 w-5 animate-pulse" />
                               <p className="text-xs font-black uppercase tracking-[0.2em]">Pending Review by Teacher</p>
                            </div>
                          )}
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
                         Student Submissions ({getSubmissionsForAssignment(asg.id).length})
                       </h5>
                    </div>
                    
                    <div className="space-y-6">
                      {getSubmissionsForAssignment(asg.id).length === 0 ? (
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm text-center py-10 border-4 border-dashed border-black/5 rounded-3xl">No submissions yet.</p>
                      ) : (
                        getSubmissionsForAssignment(asg.id).map(sub => (
                          <div key={sub.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)] transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                              <div className="flex items-center gap-5">
                                 <div className="w-14 h-14 bg-[#FF6B57]/10 rounded-2xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="text-xl font-black text-black uppercase">{sub.studentName?.[0] || 'S'}</span>
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-lg font-black text-black uppercase tracking-tight truncate">{sub.studentName || 'Unknown Student'}</p>
                                   <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 border-2 border-black/5 rounded-lg">Roll: {sub.rollNumber || 'N/A'}</span>
                                      {sub.submittedAt && (
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          {format(sub.submittedAt.toDate(), 'MMM d')}
                                        </span>
                                      )}
                                   </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 w-full lg:w-auto">
                                <button 
                                  onClick={() => openFile(sub.cloudinaryUrl)}
                                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest border-4 border-black rounded-2xl hover:bg-[#FF6B57] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </button>
                                <button 
                                  onClick={() => downloadFile(sub.cloudinaryUrl, `project_${sub.studentName || sub.studentId.substring(0,5)}`)}
                                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-black text-white text-xs font-black uppercase tracking-widest border-4 border-black rounded-2xl hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                                >
                                  <Download className="h-4 w-4" />
                                  Save
                                </button>
                              </div>
                            </div>
                            
                            {gradingSubId === sub.id ? (
                              <form onSubmit={(e) => handleGrade(e, sub.id)} className="mt-6 pt-6 border-t-4 border-black border-dashed space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                   <div className="sm:col-span-1 space-y-2">
                                      <label className="text-xs font-black uppercase tracking-widest text-black ml-1">Grade / {asg.totalMarks}</label>
                                      <input
                                        type="number"
                                        placeholder="Marks"
                                        required
                                        max={asg.totalMarks}
                                        className="w-full border-4 border-black rounded-[1.25rem] px-6 py-4 text-xl font-black bg-[#FAFAFA]"
                                        value={marks}
                                        onChange={(e) => setMarks(e.target.value)}
                                      />
                                   </div>
                                   <div className="sm:col-span-2 space-y-2">
                                      <label className="text-xs font-black uppercase tracking-widest text-black ml-1">Teacher Feedback</label>
                                      <input
                                        type="text"
                                        placeholder="Add encouragement or areas to improve..."
                                        className="w-full border-4 border-black rounded-[1.25rem] px-6 py-4 text-sm font-bold bg-[#FAFAFA]"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                      />
                                   </div>
                                </div>
                                <div className="flex space-x-4">
                                  <button type="submit" className="flex-1 bg-[#FF6B57] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-all">Publish Grade</button>
                                  <button type="button" onClick={() => setGradingSubId(null)} className="px-8 py-4 text-black font-black uppercase tracking-widest hover:underline transition-all">Discard</button>
                                </div>
                              </form>
                            ) : (
                              <div className="mt-6 pt-6 border-t-4 border-black border-dashed flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                {sub.marks !== null ? (
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-baseline gap-1.5 bg-[#FF6B57] px-4 py-2 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                        <span className="text-xl font-black text-black">{sub.marks}</span>
                                        <span className="text-[10px] font-black text-black/50">/ {asg.totalMarks}</span>
                                     </div>
                                     {sub.feedback && <p className="text-sm font-bold text-gray-500 italic truncate max-w-[200px]">"{sub.feedback}"</p>}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border-2 border-amber-200">
                                     <AlertCircle className="h-4 w-4" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Grade</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => { setGradingSubId(sub.id); setMarks(sub.marks?.toString() || ''); setFeedback(sub.feedback || ''); }}
                                  className="w-full sm:w-auto px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                                >
                                  {sub.marks !== null ? 'Modify Assessment' : 'Evaluate Work'}
                                </button>
                              </div>
                            )}
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
