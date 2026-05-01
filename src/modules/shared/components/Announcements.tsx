import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';

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
    <div className="space-y-8 p-6 sm:p-10">
      {isTeacher && (
        <div className="bg-white p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-extrabold text-black mb-4">Post an Announcement</h3>
          <form onSubmit={handlePost}>
            <textarea
              className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400 text-lg"
              rows={3}
              placeholder="Share something with your class..."
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!newAnnouncement.trim() || loading}
                className="bg-[#FF6B57] text-black px-8 py-3 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
            <p className="text-xl font-bold text-black mb-2">No announcements yet</p>
            <p className="text-gray-500 font-medium">When teachers post updates, they will appear here.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-white p-8 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full border-2 border-black bg-[#FAFAFA] flex items-center justify-center text-black font-extrabold mr-4 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {ann.authorName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-extrabold text-black text-lg">{ann.authorName}</p>
                    <p className="text-sm font-bold text-gray-500 tracking-wide">
                      {ann.timestamp?.toDate ? format(ann.timestamp.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-black font-medium text-lg whitespace-pre-wrap mt-4 leading-relaxed">{ann.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
