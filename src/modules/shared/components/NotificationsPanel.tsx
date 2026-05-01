import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Bell, CheckCircle, Info, Calendar, Video, FileUp } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsPanel({ classroomId, classroomIds }: { classroomId?: string, classroomIds?: string[] }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    let q;
    if (classroomId) {
      q = query(
        collection(db, 'notifications'),
        where('classroomId', '==', classroomId),
        orderBy('timestamp', 'desc'),
        limit(15)
      );
    } else if (classroomIds && classroomIds.length > 0) {
      // Use the 'in' operator to filter by multiple classrooms
      // Note: Firestore 'in' limit is 30.
      q = query(
        collection(db, 'notifications'),
        where('classroomId', 'in', classroomIds.slice(0, 30)),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    } else if (classroomIds && classroomIds.length === 0) {
      // If we have an empty array of classrooms, don't fetch anything universal
      setNotifications([]);
      return;
    } else {
      // Fallback/Legacy: Fetch recent but restricted to user if possible
      q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(notif => {
        // Filter by targetUids if present
        if (notif.targetUids && !notif.targetUids.includes(user.uid)) {
          return false;
        }
        return true;
      });
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user, classroomId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'homework_posted': return <Calendar className="h-5 w-5 text-yellow-500" />;
      case 'assignment_posted': return <CheckCircle className="h-5 w-5 text-red-500" />;
      case 'meeting_started': return <Video className="h-5 w-5 text-green-500" />;
      case 'material_uploaded': return <FileUp className="h-5 w-5 text-blue-500" />;
      case 'approval_granted': return <CheckCircle className="h-5 w-5 text-indigo-500" />;
      case 'announcement_posted': return <Bell className="h-5 w-5 text-orange-500" />;
      case 'homework_submitted': return <FileUp className="h-5 w-5 text-teal-500" />;
      case 'assignment_submitted': return <FileUp className="h-5 w-5 text-rose-500" />;
      case 'assignment_graded': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default: return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FAFAFA] rounded-[1rem] border-2 border-black border-dashed m-4">
        <Bell className="mx-auto h-10 w-10 text-black mb-3 opacity-50" />
        <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">No new notifications.</p>
      </div>
    );
  }

  return (
    <div className="divide-y-2 divide-black bg-white rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden m-2 sm:m-0">
      {notifications.map((notif) => (
        <div key={notif.id} className="p-5 hover:bg-[#FAFAFA] transition-colors group cursor-pointer">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1 p-2 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white group-hover:-translate-y-0.5 transition-all">
              {getIcon(notif.type)}
            </div>
            <div className="ml-4 flex-1">
              <p className="text-base font-extrabold text-black leading-tight">{notif.title}</p>
              <p className="text-sm font-bold text-gray-600 mt-1.5">{notif.message}</p>
              <p className="text-xs font-black text-[#FF6B57] mt-2 uppercase tracking-wide">
                {notif.timestamp?.toDate ? format(notif.timestamp.toDate(), 'p • MMM d') : 'Just now'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
