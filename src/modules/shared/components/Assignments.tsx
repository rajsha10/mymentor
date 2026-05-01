import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getClassroomBot, addDocument as addDocumentToBot } from '../../../services/backendApi';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { Trash2, Download, ExternalLink } from 'lucide-react';
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
    <div className="p-6 sm:p-10 space-y-8">
      {isTeacher && (
        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-extrabold text-black">Assignments</h3>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-black text-white px-8 py-3 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-colors"
          >
            {showCreate ? 'Cancel' : 'Create Assignment'}
          </button>
        </div>
      )}

      {showCreate && isTeacher && (
        <div className="bg-[#FAFAFA] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">Total Marks</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Description</label>
              <textarea
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Deadline</label>
              <input
                type="datetime-local"
                required
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Attachment (PDF Only)</label>
              <input
                type="file"
                accept=".pdf"
                className="w-full block text-sm text-black file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-2 file:border-black file:font-bold file:bg-[#FF6B57] file:text-black hover:file:bg-[#FF8A7A] transition-colors cursor-pointer"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <div className="flex justify-end mt-4">

              <button
                type="submit"
                disabled={loading}
                className="bg-[#FF6B57] text-black px-10 py-4 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {assignments.length === 0 ? (
          <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
            <p className="text-xl font-bold text-black mb-2">No assignments created yet</p>
            <p className="text-gray-500 font-medium">Class assignments will show up here.</p>
          </div>
        ) : (
          assignments.map((asg) => (
            <div key={asg.id} className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-2xl font-extrabold text-black">{asg.title}</h4>
                    <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-wide">
                      Deadline: {format(new Date(asg.deadline), 'MMM d, yyyy h:mm a')} • Total Marks: {asg.totalMarks}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(asg.id)}
                        className="p-2 bg-red-500 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors"
                        title="Delete Assignment"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    {!isTeacher && (
                      hasSubmitted(asg.id) ? (
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-green-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Pending
                        </span>
                      )
                    )}
                  </div>
                </div>

                <p className="mt-4 text-black text-lg font-medium whitespace-pre-wrap leading-relaxed">{asg.description}</p>
                
                {asg.fileUrl && (
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => openFile(asg.fileUrl)}
                      className="inline-flex items-center px-6 py-3 bg-[#FAFAFA] text-black text-sm font-bold uppercase tracking-wider rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Reference Materials
                    </button>
                    <button
                      onClick={() => downloadFile(asg.fileUrl, `assignment_${asg.title}`)}
                      className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-bold uppercase tracking-wider rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                )}

                
                {!isTeacher && !hasSubmitted(asg.id) && (
                  <div className="mt-8 pt-8 border-t-2 border-black border-dashed">
                    {selectedAssignment === asg.id ? (
                      <form onSubmit={(e) => handleSubmit(e, asg.id)} className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAFAFA] p-6 rounded-[1rem] border-2 border-black">
                        <input
                          type="file"
                          accept=".pdf"
                          required
                          className="w-full sm:flex-1 text-sm text-black file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-2 file:border-black file:font-bold file:bg-[#FF6B57] file:text-black hover:file:bg-[#FF8A7A] cursor-pointer"
                          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                        <button
                          type="submit"
                          disabled={submitLoading || !file}
                          className="w-full sm:w-auto bg-black text-white px-8 py-3 rounded-full font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {submitLoading ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedAssignment(null); setFile(null); }}
                          className="w-full sm:w-auto px-6 py-3 text-black font-bold uppercase tracking-wide hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setSelectedAssignment(asg.id)}
                        className="w-full sm:w-auto bg-[#FF6B57] text-black px-10 py-4 rounded-full font-extrabold uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-colors"
                      >
                        Add Submission
                      </button>
                    )}
                  </div>
                )}

                {!isTeacher && hasSubmitted(asg.id) && (
                  <div className="mt-8 pt-8 border-t-2 border-black border-dashed">
                    {(() => {
                      const mySub = submissions.find(s => s.assignmentId === asg.id && s.studentId === user?.uid);
                      return (
                        <div>
                          <div className="flex flex-wrap items-center gap-4">
                            <button 
                              onClick={() => openFile(mySub.cloudinaryUrl)}
                              className="bg-black text-white text-sm font-bold uppercase tracking-wider flex items-center px-6 py-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View My Submission
                            </button>
                            <button 
                              onClick={() => downloadFile(mySub.cloudinaryUrl, `my_assignment_${asg.title}`)}
                              className="bg-[#FAFAFA] text-black text-sm font-bold uppercase tracking-wider flex items-center px-6 py-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-white transition-colors"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </button>
                          </div>

                          {mySub?.marks !== null ? (
                            <div className="mt-6 bg-[#FAFAFA] p-6 rounded-[1rem] border-2 border-black">
                              <p className="text-lg font-bold text-black mb-2"><span className="uppercase tracking-wide text-gray-500">Marks:</span> {mySub.marks} / {asg.totalMarks}</p>
                              {mySub.feedback && <p className="text-lg font-medium text-black mt-1"><span className="uppercase tracking-wide text-gray-500 font-bold text-base">Feedback:</span> {mySub.feedback}</p>}
                            </div>
                          ) : (
                            <p className="mt-6 text-sm text-gray-500 font-bold uppercase tracking-wider">Not graded yet.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isTeacher && (
                  <div className="mt-8 pt-6 border-t-2 border-black">
                    <h5 className="text-xl font-extrabold text-black mb-6">
                      Submissions ({getSubmissionsForAssignment(asg.id).length})
                    </h5>
                    <div className="space-y-4">
                      {getSubmissionsForAssignment(asg.id).map(sub => (
                        <div key={sub.id} className="bg-[#FAFAFA] p-5 rounded-[1rem] border-2 border-black shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <span className="text-base text-black flex flex-col">
                              <span className="font-extrabold">{sub.studentName || 'Unknown Student'}</span>
                              <span className="text-sm font-bold text-gray-500 uppercase mt-1">Roll No: {sub.rollNumber || 'N/A'}</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => openFile(sub.cloudinaryUrl)}
                                className="bg-white text-black text-sm font-bold flex items-center px-4 py-2 border-2 border-black rounded-full hover:bg-gray-100 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                View
                              </button>
                              <button 
                                onClick={() => downloadFile(sub.cloudinaryUrl, `project_${sub.studentName || sub.studentId.substring(0,5)}`)}
                                className="bg-black text-white text-sm font-bold flex items-center px-4 py-2 border-2 border-black rounded-full hover:bg-gray-800 transition-colors"
                              >
                                <Download className="h-4 w-4 mr-1.5" />
                                Download
                              </button>
                            </div>

                          </div>
                          
                          {gradingSubId === sub.id ? (
                            <form onSubmit={(e) => handleGrade(e, sub.id)} className="mt-4 pt-4 border-t-2 border-black border-dashed space-y-4">
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  placeholder="Marks"
                                  required
                                  max={asg.totalMarks}
                                  className="w-24 border-2 border-black rounded-[0.5rem] px-3 py-2 text-sm font-bold"
                                  value={marks}
                                  onChange={(e) => setMarks(e.target.value)}
                                />
                                <span className="font-bold text-gray-500">/ {asg.totalMarks}</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Feedback (optional)"
                                className="w-full border-2 border-black rounded-[0.5rem] px-4 py-3 text-sm font-medium"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                              />
                              <div className="flex space-x-3">
                                <button type="submit" className="bg-[#FF6B57] text-black px-6 py-2 rounded-full font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-colors">Save</button>
                                <button type="button" onClick={() => setGradingSubId(null)} className="bg-white text-black px-6 py-2 rounded-full font-bold border-2 border-black hover:bg-gray-100 transition-colors">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="mt-4 pt-4 border-t-2 border-black border-dashed flex justify-between items-center">
                              {sub.marks !== null ? (
                                <div className="text-sm">
                                  <span className="font-extrabold text-black bg-[#FF6B57] px-2 py-1 rounded border border-black">{sub.marks} / {asg.totalMarks}</span>
                                  {sub.feedback && <span className="text-black font-medium ml-3">- {sub.feedback}</span>}
                                </div>
                              ) : (
                                <span className="text-sm text-yellow-600 font-bold uppercase tracking-wider">Not graded</span>
                              )}
                              <button
                                onClick={() => { setGradingSubId(sub.id); setMarks(sub.marks?.toString() || ''); setFeedback(sub.feedback || ''); }}
                                className="text-sm font-bold text-black underline hover:text-[#FF6B57]"
                              >
                                {sub.marks !== null ? 'Edit Grade' : 'Grade'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
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
