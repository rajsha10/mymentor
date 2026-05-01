import { useState, useEffect } from 'react';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Users, BookOpen, Video, Activity } from 'lucide-react';

export default function AnalyticsPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    countClassrooms: 0,
    activeMeetings: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const classSnap = await getDocs(collection(db, 'classrooms'));
      
      const users = usersSnap.docs.map(d => d.data());
      const classrooms = classSnap.docs.map(d => d.data());

      setStats({
        totalUsers: users.length,
        totalTeachers: users.filter(u => u.role === 'teacher').length,
        totalStudents: users.filter(u => u.role === 'student').length,
        countClassrooms: classrooms.length,
        activeMeetings: classrooms.filter(c => c.meetingActive).length
      });
    };

    fetchStats();
    
    // Realtime listeners for some stats
    const unsubClasses = onSnapshot(collection(db, 'classrooms'), (snap) => {
      const classrooms = snap.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        countClassrooms: classrooms.length,
        activeMeetings: classrooms.filter(c => c.meetingActive).length
      }));
    });

    return () => unsubClasses();
  }, []);

  const cards = [
    { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Active Teachers', value: stats.totalTeachers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Classrooms', value: stats.countClassrooms, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Live Meetings', value: stats.activeMeetings, icon: Video, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-black flex items-center">
        <Activity className="mr-3 h-8 w-8 text-[#FF6B57]" />
        System Analytics
      </h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden flex flex-col justify-center min-h-[140px]">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-[1rem] p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${card.bg === 'bg-blue-100' ? 'bg-[#FF6B57]' : 'bg-white'}`}>
                  <card.icon className="h-8 w-8 text-black" aria-hidden="true" />
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dt className="text-sm font-black text-gray-500 uppercase tracking-widest truncate mb-1">{card.name}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-4xl font-black text-black">{card.value}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-[#FFF9C4] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-2xl font-black text-black mb-4">Platform Health</h3>
        <p className="text-lg font-bold text-gray-800 leading-relaxed max-w-3xl">All systems are operational. Realtime Firebase synchronization is active across all dashboard modules. Neo-brutalist UI module active.</p>
      </div>
    </div>
  );
}
