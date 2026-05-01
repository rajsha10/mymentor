import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayRemove, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { sendNotification } from '../../../services/notificationService';

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
    <div className="p-6 sm:p-10 space-y-12">
      {isTeacher && pendingUsers.length > 0 && (
        <div>
          <h3 className="text-2xl font-extrabold text-black mb-6">Pending Requests ({pendingUsers.length})</h3>
          <div className="bg-[#FAFAFA] rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <ul className="divide-y-2 divide-black">
              {pendingUsers.map((user) => (
                <li key={user.uid} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFF9C4]">
                  <div>
                    <p className="text-xl font-extrabold text-black truncate">{user.name}</p>
                    <p className="text-sm font-bold tracking-wider text-black mt-1 uppercase">Roll: {user.rollNumber} | Class: {user.class} {user.section}</p>
                  </div>
                  <div className="flex space-x-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleApprove(user)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black bg-green-400 hover:bg-green-500 transition-all uppercase tracking-wider text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user)}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-3 border-2 border-black font-extrabold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white bg-red-500 hover:bg-red-600 transition-all uppercase tracking-wider text-sm"
                    >
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-extrabold text-black">Students</h3>
          <span className="bg-[#FF6B57] text-black px-4 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black text-sm">
            {students.length} Total
          </span>
        </div>
        
        {students.length === 0 ? (
          <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
            <p className="text-xl font-bold text-gray-500">No students have joined this classroom yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <ul className="divide-y-2 divide-black">
              {students.map((user) => (
                <li key={user.uid} className="p-6 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-14 w-14 rounded-full border-2 border-black bg-[#FF6B57] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-xl">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-5">
                      <p className="text-lg font-extrabold text-black">{user.name}</p>
                      <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        <span className="text-black">Roll: {user.rollNumber}</span> • Class: {user.class} {user.section}
                      </p>
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
