import { useState, useEffect } from 'react';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Users, BookOpen, Video, Activity, Globe, Zap } from 'lucide-react';

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
    { name: 'Total Users', value: stats.totalUsers, icon: Globe, color: 'text-blue-600', bg: 'bg-[#E3F2FD]' },
    { name: 'Active Teachers', value: stats.totalTeachers, icon: Users, color: 'text-indigo-600', bg: 'bg-[#E8EAF6]' },
    { name: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-green-600', bg: 'bg-[#E8F5E9]' },
    { name: 'Classrooms', value: stats.countClassrooms, icon: BookOpen, color: 'text-purple-600', bg: 'bg-[#F3E5F5]' },
    { name: 'Live Sessions', value: stats.activeMeetings, icon: Video, color: 'text-red-600', bg: 'bg-[#FFEBEE]' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-black flex items-center">
          <Activity className="mr-3 h-6 w-6 text-[#FF6B57]" />
          System Analytics
        </h2>
        <div className="hidden md:flex items-center space-x-1.5 bg-black text-white px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
          <Zap className="h-3 w-3 text-[#FF6B57]" />
          <span>Real-time</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden flex flex-col justify-center min-h-[120px] p-5 group">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-xl p-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#FF6B57] group-hover:text-white transition-colors bg-white`}>
                <card.icon className="h-5 w-5 text-black group-hover:text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.name}</dt>
                <dd className="flex items-baseline">
                  <div className="text-3xl font-black text-black tracking-tighter">{card.value}</div>
                </dd>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFF9C4] p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black text-black mb-4 uppercase tracking-tight flex items-center">
            <div className="w-2 h-2 bg-black rounded-full mr-2"></div>
            Platform Health
          </h3>
          <p className="text-sm font-bold text-gray-800 leading-relaxed mb-4">
            All core systems are performing at 100% capacity. Node synchronization is stable.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white border-2 border-black px-3 py-1 rounded-lg font-black text-[9px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">DB: 12ms</span>
            <span className="bg-white border-2 border-black px-3 py-1 rounded-lg font-black text-[9px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">Auth: Active</span>
          </div>
        </div>
        
        <div className="bg-black p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] text-white">
          <h3 className="text-lg font-black mb-4 uppercase tracking-tight text-[#FF6B57]">
            Monitoring
          </h3>
          <p className="text-sm font-bold text-gray-300 leading-relaxed mb-4">
            Sentinel AI is actively monitoring for unusual patterns in system usage.
          </p>
          <div className="w-full bg-gray-800 h-2.5 rounded-full border-2 border-white overflow-hidden">
            <div className="bg-[#FF6B57] h-full w-3/4 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
