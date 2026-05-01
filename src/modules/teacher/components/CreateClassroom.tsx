import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sendAdminNotification } from '../../../services/notificationService';
import { createClassroomBots } from '../../../services/backendApi';

export default function CreateClassroom({ onCreated }: { onCreated: () => void }) {
  const { user, userData } = useAuth();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Generate a simple unique ID (e.g., PHY9K2X)
      const classroomId = Math.random().toString(36).substring(2, 9).toUpperCase();
      
      await addDoc(collection(db, 'classrooms'), {
        classroomId,
        name,
        subject,
        description,
        visibility,
        teacherId: user.uid,
        teacherName: userData?.name || 'Faculty',
        students: [],
        pendingRequests: [],
        meetingActive: false,
        meetingStartTime: null,
        meetingLink: '',
        createdAt: serverTimestamp()
      });

      // Auto-create homework, assignments, and tests bots for this classroom
      try {
        await createClassroomBots(classroomId, name);
      } catch (err) {
        console.warn('Could not create classroom bots (backend may be offline):', err);
      }

      // Send Admin Notification
      await sendAdminNotification(
        'New Classroom Created',
        `Class "${name}" for ${subject} was created by teacher UID: ${user.uid}.`,
        'classroom_created',
        { classroomId, name, teacherId: user.uid }
      );

      
      setName('');
      setSubject('');
      setDescription('');
      onCreated();
    } catch (error) {
      console.error("Error creating classroom:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-black mb-6">Create New Classroom</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black uppercase tracking-wider">Class Name</label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
              placeholder="e.g. Physics 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black uppercase tracking-wider">Subject</label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
              placeholder="e.g. Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-black uppercase tracking-wider">Description</label>
          <textarea
            className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA] placeholder-gray-400"
            placeholder="Briefly describe what this class is about..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-black uppercase tracking-wider">Visibility</label>
          <select
            className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-[#FAFAFA]"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-4 border-2 border-black text-lg font-bold rounded-full text-white bg-black hover:bg-gray-800 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {loading ? 'Creating...' : 'Create Classroom'}
        </button>
      </form>
    </div>
  );
}
