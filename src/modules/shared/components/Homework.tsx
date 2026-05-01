import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { Trash2, Download, ExternalLink } from 'lucide-react';
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
    
    // If student, only fetch their submissions
    // If teacher, fetch all submissions for this classroom
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
    <div className="p-6 sm:p-10 space-y-8">
      {isTeacher && (
        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-extrabold text-black">Homework</h3>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-black text-white px-8 py-3 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-colors"
          >
            {showCreate ? 'Cancel' : 'Create Homework'}
          </button>
        </div>
      )}

      {showCreate && isTeacher && (
        <div className="bg-[#FAFAFA] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Title</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold text-lg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
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
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Due Date (Optional)</label>
              <input
                type="datetime-local"
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Instructions / Brief (PDF Only)</label>
              <input
                type="file"
                accept=".pdf"
                className="w-full block text-sm text-black file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-2 file:border-black file:text-sm file:font-bold file:bg-[#FF6B57] file:text-black hover:file:bg-[#FF8A7A] transition-colors cursor-pointer"
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
        {homeworks.length === 0 ? (
          <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
            <p className="text-xl font-bold text-black mb-2">No homework assigned yet</p>
            <p className="text-gray-500 font-medium">Assignments will show up here.</p>
          </div>
        ) : (
          homeworks.map((hw) => (
            <div key={hw.id} className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-2xl font-extrabold text-black">{hw.title}</h4>
                    <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-wide">
                      Posted: {hw.timestamp?.toDate ? format(hw.timestamp.toDate(), 'MMM d, yyyy') : ''}
                      {hw.dueDate && ` • Due: ${format(new Date(hw.dueDate), 'MMM d, yyyy h:mm a')}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="p-2 bg-red-500 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors"
                        title="Delete Homework"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    {!isTeacher && (
                      hasSubmitted(hw.id) ? (
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

                <p className="mt-4 text-black text-lg font-medium whitespace-pre-wrap leading-relaxed">{hw.description}</p>
                
                {hw.fileUrl && (
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button 
                      onClick={() => openFile(hw.fileUrl)}
                      className="inline-flex items-center px-6 py-3 bg-[#FAFAFA] text-black text-sm font-bold uppercase tracking-wider rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Instructions
                    </button>
                    <button 
                      onClick={() => downloadFile(hw.fileUrl, `brief_${hw.title}`)}
                      className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-bold uppercase tracking-wider rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                )}

                
                {!isTeacher && !hasSubmitted(hw.id) && (
                  <div className="mt-8 pt-8 border-t-2 border-black border-dashed">
                    {selectedHomework === hw.id ? (
                      <form onSubmit={(e) => handleSubmit(e, hw.id)} className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAFAFA] p-6 rounded-[1rem] border-2 border-black">
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
                          onClick={() => { setSelectedHomework(null); setFile(null); }}
                          className="w-full sm:w-auto px-6 py-3 text-black font-bold uppercase tracking-wide hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setSelectedHomework(hw.id)}
                        className="w-full sm:w-auto bg-[#FF6B57] text-black px-10 py-4 rounded-full font-extrabold uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-colors"
                      >
                        Add Submission
                      </button>
                    )}
                  </div>
                )}

                {!isTeacher && hasSubmitted(hw.id) && (
                  <div className="mt-8 pt-8 border-t-2 border-black border-dashed">
                    {(() => {
                      const sub = submissions.find(s => s.homeworkId === hw.id && s.studentId === user?.uid);
                      if (!sub) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-4">
                          <button 
                            onClick={() => openFile(sub.cloudinaryUrl)}
                            className="bg-black text-white text-sm font-bold uppercase tracking-wider flex items-center px-6 py-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View My Submission
                          </button>
                          <button 
                            onClick={() => downloadFile(sub.cloudinaryUrl, `my_homework_${hw.title}`)}
                            className="bg-[#FAFAFA] text-black text-sm font-bold uppercase tracking-wider flex items-center px-6 py-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-white transition-colors"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}


                {isTeacher && (
                  <div className="mt-8 pt-6 border-t-2 border-black">
                    <h5 className="text-xl font-extrabold text-black mb-6">
                      Submissions ({getSubmissionsForHomework(hw.id).length})
                    </h5>
                    <div className="space-y-4">
                      {getSubmissionsForHomework(hw.id).map(sub => (
                        <div key={sub.id} className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-[#FAFAFA] p-5 rounded-[1rem] border-2 border-black shadow-sm gap-4">
                          <span className="text-base text-black flex flex-col">
                            <span className="font-extrabold">{sub.studentName || 'Unknown Student'}</span>
                            <span className="text-sm font-bold text-gray-500 uppercase">Roll No: {sub.rollNumber || 'N/A'}</span>
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
                              onClick={() => downloadFile(sub.cloudinaryUrl, `submission_${sub.studentName || sub.studentId.substring(0,5)}`)}
                              className="bg-black text-white text-sm font-bold flex items-center px-4 py-2 border-2 border-black rounded-full hover:bg-gray-800 transition-colors"
                            >
                              <Download className="h-4 w-4 mr-1.5" />
                              Download
                            </button>
                          </div>
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
