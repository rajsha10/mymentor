import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayRemove, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendNotification } from '../../../services/notificationService';
import { Users, UserPlus, Check, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Participants({ classroom, isTeacher }: { classroom: any, isTeacher: boolean }) {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch details for pending requests
      if (classroom.pendingRequests?.length > 0) {
        const pending = await Promise.all(
          classroom.pendingRequests.map(async (req: any) => {
            const userDoc = await getDoc(doc(db, 'users', req.uid));
            return { ...userDoc.data(), uid: req.uid, requestTime: req.timestamp };
          })
        );
        setPendingUsers(pending);
      } else {
        setPendingUsers([]);
      }

      // Fetch details for students
      if (classroom.students?.length > 0) {
        const studentList = await Promise.all(
          classroom.students.map(async (req: any) => {
            const userDoc = await getDoc(doc(db, 'users', req.uid));
            return { ...userDoc.data(), uid: req.uid, joinedAt: req.timestamp };
          })
        );
        setStudents(studentList);
      } else {
        setStudents([]);
      }
    };

    fetchUsers();
  }, [classroom.pendingRequests, classroom.students]);

  const handleApprove = async (user: any) => {
    try {
      const classRef = doc(db, 'classrooms', classroom.id);
      
      // Find the exact object in pendingRequests to remove
      const requestObj = classroom.pendingRequests.find((r: any) => r.uid === user.uid);
      
      await updateDoc(classRef, {
        pendingRequests: arrayRemove(requestObj),
        students: arrayUnion({
          uid: user.uid,
          timestamp: new Date().toISOString()
        })
      });

      // Send Personal Notification to the student
      await sendNotification(
        classroom.id,
        'Access Granted',
        `Your request to join ${classroom.name} has been approved.`,
        'approval_granted',
        [user.uid]
      );

    } catch (error) {
      console.error("Error approving student:", error);
    }
  };

  const handleReject = async (user: any) => {
    try {
      const classRef = doc(db, 'classrooms', classroom.id);
      const requestObj = classroom.pendingRequests.find((r: any) => r.uid === user.uid);
      
      await updateDoc(classRef, {
        pendingRequests: arrayRemove(requestObj)
      });
    } catch (error) {
      console.error("Error rejecting student:", error);
    }
  };

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-12">
      {isTeacher && pendingUsers.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 mb-8 ml-2">
             <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
                <UserPlus className="h-5 w-5 text-white" />
             </div>
             <h3 className="text-2xl font-black text-black uppercase tracking-tight">Pending Requests ({pendingUsers.length})</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(255,249,196,1)] overflow-hidden">
            <ul className="divide-y-4 divide-black">
              {pendingUsers.map((user) => (
                <li key={user.uid} className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-[#FFF9C4]/30 hover:bg-[#FFF9C4]/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl border-4 border-black bg-white flex items-center justify-center text-black font-black text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xl font-black text-black uppercase tracking-tight">{user.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                         <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2.5 py-1 rounded-lg">ROLL: {user.rollNumber}</span>
                         <span className="text-[10px] font-black uppercase tracking-widest bg-[#FF6B57] text-black px-2.5 py-1 rounded-lg">CLASS: {user.class}-{user.section}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => handleApprove(user)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-8 py-3.5 border-4 border-black font-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black bg-emerald-400 hover:bg-emerald-500 transition-all uppercase tracking-widest text-xs active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-8 py-3.5 border-4 border-black font-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white bg-black hover:bg-red-500 transition-all uppercase tracking-widest text-xs active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
                <Users className="h-5 w-5 text-white" />
             </div>
             <h3 className="text-2xl font-black text-black uppercase tracking-tight">Active Students</h3>
          </div>
          <span className="bg-[#FF6B57] text-black px-6 py-2 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest">
            {students.length} Members
          </span>
        </div>
        
        {students.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-black border-dashed opacity-40">
             <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Users className="h-12 w-12 text-gray-300" />
             </div>
             <p className="text-xl font-black text-black uppercase tracking-tight">No students enrolled yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)] overflow-hidden transition-all hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <ul className="divide-y-4 divide-black">
              {students.map((user) => (
                <li key={user.uid} className="p-6 sm:p-8 flex items-center justify-between hover:bg-[#FF6B57]/5 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-2xl group-hover:bg-[#FF6B57] transition-colors">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xl font-black text-black uppercase tracking-tight">{user.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B57]" />
                           Roll: {user.rollNumber}
                        </p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-black" />
                           Class: {user.class}-{user.section}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-3">
                     {user.joinedAt && (
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest tabular-nums">
                           Joined {format(new Date(user.joinedAt), 'MMM yyyy')}
                        </span>
                     )}
                     <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border-2 border-black/5 group-hover:border-black/10 transition-all shadow-inner">
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-black transition-colors" />
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
