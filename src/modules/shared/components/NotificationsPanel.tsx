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
      <div className="p-12 text-center bg-white rounded-[2.5rem] border-4 border-black border-dashed opacity-50 m-6">
        <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-xs">No updates yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y-4 divide-black bg-white rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden m-4 sm:m-6">
      {notifications.map((notif) => (
        <div key={notif.id} className="p-6 sm:p-8 hover:bg-[#FF6B57]/5 transition-all group cursor-default relative overflow-hidden">
          {/* Subtle hover indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF6B57] translate-x-[-100%] group-hover:translate-x-0 transition-transform" />
          
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 p-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white group-hover:-translate-y-1 transition-all group-hover:bg-[#FF6B57]/10">
              {getIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-lg font-black text-black leading-tight uppercase tracking-tight truncate pr-4">{notif.title}</p>
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest shrink-0 mt-1 tabular-nums">
                   {notif.timestamp?.toDate ? format(notif.timestamp.toDate(), 'p') : 'NOW'}
                 </p>
              </div>
              <p className="text-sm font-bold text-gray-500 leading-relaxed mb-3">{notif.message}</p>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B57]" />
                 <p className="text-[10px] font-black text-[#FF6B57] uppercase tracking-[0.2em]">
                   {notif.timestamp?.toDate ? format(notif.timestamp.toDate(), 'MMMM d, yyyy') : 'Recently'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
