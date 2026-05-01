import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type NotificationType = 
  | 'homework_posted' 
  | 'assignment_posted' 
  | 'meeting_started' 
  | 'material_uploaded' 
  | 'approval_granted' 
  | 'announcement_posted'
  | 'homework_submitted'
  | 'assignment_submitted'
  | 'assignment_graded';

export type AdminNotificationType = 
  | 'new_teacher_signup' 
  | 'student_removed' 
  | 'teacher_removed' 
  | 'teacher_transferred' 
  | 'student_transferred' 
  | 'classroom_created';

export const sendNotification = async (
  classroomId: string, 
  title: string, 
  message: string, 
  type: NotificationType,
  targetUids?: string[] // Optional: if empty, it's for everyone in classroom
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      classroomId,
      title,
      message,
      type,
      targetUids: targetUids || null,
      readBy: [],
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const sendAdminNotification = async (
  title: string,
  message: string,
  type: AdminNotificationType,
  metadata?: any
) => {
  try {
    await addDoc(collection(db, 'adminNotifications'), {
      title,
      message,
      type,
      metadata: metadata || {},
      read: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};
