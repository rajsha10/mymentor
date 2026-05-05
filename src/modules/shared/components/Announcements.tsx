import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { Bell, Megaphone, Send, Clock, Loader } from 'lucide-react';

export default function Announcements({ classroomId, isTeacher }: { classroomId: string, isTeacher: boolean }) {
  const { user, userData } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, `classrooms/${classroomId}/announcements`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const anns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(anns);
    });

    return () => unsubscribe();
  }, [classroomId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim() || !user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, `classrooms/${classroomId}/announcements`), {
        text: newAnnouncement,
        authorId: user.uid,
        authorName: userData?.name || 'Teacher',
        timestamp: serverTimestamp()
      });

      // Send Notification
      await sendNotification(
        classroomId,
        'Announcement Posted',
        `${userData?.name || 'Teacher'} posted a new announcement: ${newAnnouncement.substring(0, 50)}${newAnnouncement.length > 50 ? '...' : ''}`,
        'announcement_posted'
      );

      setNewAnnouncement('');
    } catch (error) {
      console.error("Error posting announcement:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 p-4 sm:p-8 lg:p-12">
      {isTeacher && (
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          {/* Decorative background for teacher input */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <Bell className="h-24 w-24" />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight">Post Announcement</h3>
          </div>

          <form onSubmit={handlePost} className="relative z-10">
            <textarea
              className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-[#FAFAFA] placeholder-gray-400 text-lg font-bold shadow-inner"
              rows={3}
              placeholder="Share something with your class..."
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
            ></textarea>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={!newAnnouncement.trim() || loading}
                className="group flex items-center gap-2 bg-[#FF6B57] text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                )}
                <span>{loading ? 'Posting...' : 'Post Now'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {announcements.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-black border-dashed opacity-60">
            <div className="w-20 h-20 bg-gray-50 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-2xl font-black text-black uppercase tracking-tight mb-2">No announcements yet</p>
            <p className="text-gray-400 font-bold uppercase tracking-wide text-sm">Updates from teachers will appear here.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="group bg-white p-6 sm:p-10 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="h-14 w-14 rounded-2xl border-4 border-black bg-[#FF6B57]/10 flex items-center justify-center text-black font-black text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#FF6B57] transition-colors">
                    {ann.authorName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-5">
                    <p className="font-black text-black text-xl uppercase tracking-tight">{ann.authorName}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <Clock className="h-3.5 w-3.5 text-[#FF6B57]" />
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         {ann.timestamp?.toDate ? format(ann.timestamp.toDate(), 'MMM d, yyyy • h:mm a') : 'Just now'}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50/50 p-6 rounded-[1.5rem] border-2 border-black/5">
                 <p className="text-black font-bold text-lg whitespace-pre-wrap leading-relaxed">{ann.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
