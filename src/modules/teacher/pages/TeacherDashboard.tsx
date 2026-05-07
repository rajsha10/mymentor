import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { auth, db } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import NotificationsPanel from '../../shared/components/NotificationsPanel';
import Profile from '../../shared/pages/Profile';
import {
  Bell,
  BookOpen,
  User,
  LayoutDashboard,
  LogOut,
  Video,
  Home,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  Lock,
  Clock
} from 'lucide-react';

export default function TeacherDashboard() {
  const { user, userData } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'classrooms' | 'profile'>('overview');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'classrooms'),
      where('teacherId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classroomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClassrooms(classroomData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
  };

  if (userData && !userData.approved) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-black selection:bg-[#FF6B57] selection:text-black">
        {/* Locked Sidebar */}
        <aside className="w-64 bg-white border-r-2 border-black hidden lg:flex flex-col sticky top-0 h-screen z-30 opacity-50 pointer-events-none select-none">
          <div className="p-6 border-b-2 border-black">
            <img src="/logo.png" alt="MyMentor Logo" className="h-20 w-auto object-contain" />
          </div>
          <nav className="flex-1 p-4 space-y-3">
            <div className="w-full flex items-center px-4 py-3 rounded-xl border-2 bg-black text-white border-black font-black text-xs">
              <Home className="h-4 w-4 mr-3" />
              Overview
            </div>
            <div className="w-full flex items-center px-4 py-3 rounded-xl border-2 border-transparent text-black font-black text-xs">
              <LayoutDashboard className="h-4 w-4 mr-3" />
              Classrooms
            </div>
            <div className="w-full flex items-center px-4 py-3 rounded-xl border-2 border-transparent text-black font-black text-xs">
              <User className="h-4 w-4 mr-3" />
              My Profile
            </div>
          </nav>
          <div className="p-4 border-t-2 border-black bg-gray-50">
            <div className="flex items-center space-x-2 mb-4 px-1">
              <div className="w-8 h-8 rounded-full border border-black bg-[#FF6B57] flex items-center justify-center font-black text-xs">
                {userData?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-black truncate">{userData?.name}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{userData?.subject}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white border-b-2 border-black px-4 py-3 flex justify-between items-center sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="MyMentor Logo" className="h-10 w-auto object-contain" />
              <h1 className="text-lg font-black tracking-tight">Teacher</h1>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border-2 border-black bg-white text-black hover:bg-red-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </header>

          {/* Blurred ghost content */}
          <main
            className="flex-1 overflow-hidden relative bg-[#FAFAFA]"
            style={{ backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
          >
            {/* Ghost dashboard content (blurred) */}
            <div className="blur-sm pointer-events-none select-none opacity-40 max-w-5xl mx-auto py-8 px-4 lg:px-8 space-y-6">
              <div className="bg-[#FF6B57] p-6 rounded-3xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-black text-black mb-1">Welcome back, {userData?.name}! 👋</h2>
                <p className="text-black/80 font-bold text-base">Ready to inspire your students today?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[{ label: 'Total Classes', color: 'bg-blue-100', val: '—' }, { label: 'Total Students', color: 'bg-green-100', val: '—' }, { label: 'Pending Requests', color: 'bg-yellow-100', val: '—' }].map(({ label, color, val }) => (
                  <div key={label} className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className={`w-10 h-10 ${color} rounded-xl border border-black mb-3`} />
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                    <p className="text-2xl font-black text-black">{val}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] h-48" />
                <div className="bg-white rounded-3xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] h-48" />
              </div>
            </div>

            {/* Approval overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
              <div className="max-w-md w-full bg-white rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Top accent bar */}
                <div className="bg-[#FF6B57] px-6 py-4 border-b-2 border-black flex items-center gap-3">
                  <div className="w-9 h-9 bg-white rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-black" />
                  </div>
                  <p className="font-black text-black text-sm uppercase tracking-wider">Account Under Review</p>
                </div>

                <div className="p-8 text-center space-y-5">
                  <div className="w-20 h-20 bg-gray-50 rounded-full border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Lock className="h-9 w-9 text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-black mb-2">Dashboard Locked</h2>
                    <p className="text-gray-600 text-sm font-medium leading-relaxed">
                      Your teacher account is pending administrator approval. Your dashboard is ready — it will unlock automatically once approved.
                    </p>
                  </div>

                  <div className="bg-[#FAFAFA] rounded-2xl border-2 border-black p-4 text-left space-y-2">
                    {[
                      { icon: <ShieldCheck className="h-4 w-4 text-green-600" />, text: 'Account created successfully', done: true },
                      { icon: <Clock className="h-4 w-4 text-yellow-500" />, text: 'Awaiting admin approval', done: false },
                      { icon: <Lock className="h-4 w-4 text-gray-400" />, text: 'Dashboard access', done: false },
                    ].map(({ icon, text, done }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${done ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}>
                          {icon}
                        </div>
                        <span className={`text-xs font-bold ${done ? 'text-black' : 'text-gray-400'}`}>{text}</span>
                        {!done && i === 1 && (
                          <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-yellow-100 border border-yellow-400 rounded-full text-yellow-700">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-black rounded-full font-black text-sm hover:bg-gray-50 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalStudents = classrooms.reduce((acc, curr) => acc + (curr.students?.length || 0), 0);
  const totalPending = classrooms.reduce((acc, curr) => acc + (curr.pendingRequests?.length || 0), 0);

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#FF6B57] p-6 rounded-3xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-black mb-1">Welcome back, {userData?.name}! 👋</h2>
          <p className="text-black/80 font-bold text-base">Ready to inspire your students today? You have {classrooms.length} active classrooms.</p>
        </div>
        <Sparkles className="absolute right-6 top-6 h-16 w-16 text-black/10 -rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl border border-black flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Classes</span>
          </div>
          <p className="text-2xl font-black text-black">{classrooms.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl border border-black flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Students</span>
          </div>
          <p className="text-2xl font-black text-black">{totalStudents}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl border border-black flex items-center justify-center">
              <Bell className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Pending Requests</span>
          </div>
          <p className="text-2xl font-black text-black">{totalPending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="p-5 border-b-2 border-black flex items-center justify-between bg-[#FAFAFA]">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-black" />
              <h3 className="text-base font-extrabold text-black">System Activity</h3>
            </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto p-4">
            <NotificationsPanel classroomIds={classrooms.map(c => c.id)} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full border-2 border-black flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-black text-black mb-1">Classrooms by Admin</h3>
            <p className="text-gray-500 text-sm font-medium">Classrooms are created and assigned to you by the administrator.</p>
          </div>
          <button
            onClick={() => setActiveTab('classrooms')}
            className="px-6 py-2.5 bg-[#FF6B57] text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            View My Classrooms
          </button>
        </div>
      </div>
    </div>
  );

  const renderClassrooms = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-black text-black">Your Classrooms</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {classrooms.map((classroom) => (
          <Link
            key={classroom.id}
            to={`/classroom/${classroom.id}`}
            className="group bg-white p-6 rounded-3xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl border border-black group-hover:bg-[#FF6B57] group-hover:text-black transition-colors">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  {classroom.meetingActive && (
                    <div className="flex items-center px-2 py-0.5 bg-[#FF6B57] text-black border border-black rounded-full text-[8px] font-black uppercase animate-pulse">
                      <Video className="h-2.5 w-2.5 mr-1" />
                      Live
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full border border-gray-200 text-[8px] font-black font-mono text-gray-400 uppercase tracking-widest">
                  {classroom.classroomId}
                </span>
              </div>
              <h3 className="text-xl font-black text-black mb-1 group-hover:text-[#FF6B57] transition-colors">{classroom.name}</h3>
              <p className="text-gray-500 text-sm font-bold">{classroom.subject}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t-2 border-gray-50 flex items-center justify-between">
              <div className="flex items-center text-xs font-bold text-gray-600">
                <Users className="h-3.5 w-3.5 mr-2" />
                {classroom.students?.length || 0} Students
              </div>
              {classroom.pendingRequests?.length > 0 && (
                <span className="bg-black text-white px-2 py-0.5 rounded-full text-[8px] font-black border border-black">
                  {classroom.pendingRequests.length} PENDING
                </span>
              )}
            </div>
          </Link>
        ))}
        
        {classrooms.length === 0 && (
          <div className="col-span-full py-16 bg-white rounded-3xl border-2 border-black border-dashed flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-black mb-4">
              <BookOpen className="h-8 w-8 text-black/20" />
            </div>
            <p className="text-xl font-black text-black mb-1">No classrooms assigned yet</p>
            <p className="text-gray-500 text-sm font-bold max-w-xs">The administrator will assign classrooms to you. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-black selection:bg-[#FF6B57] selection:text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r-2 border-black hidden lg:flex flex-col sticky top-0 h-screen z-30">
        <div className="p-6 border-b-2 border-black">
          <img src="/logo.png" alt="MyMentor Logo" className="h-20 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 p-4 space-y-3">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center px-4 py-3 rounded-xl border-2 transition-all font-black text-xs ${activeTab === 'overview' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]' : 'bg-transparent text-black border-transparent hover:bg-gray-50'}`}
          >
            <Home className="h-4 w-4 mr-3" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('classrooms')}
            className={`w-full flex items-center px-4 py-3 rounded-xl border-2 transition-all font-black text-xs ${activeTab === 'classrooms' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]' : 'bg-transparent text-black border-transparent hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="h-4 w-4 mr-3" />
            Classrooms
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center px-4 py-3 rounded-xl border-2 transition-all font-black text-xs ${activeTab === 'profile' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]' : 'bg-transparent text-black border-transparent hover:bg-gray-50'}`}
          >
            <User className="h-4 w-4 mr-3" />
            My Profile
          </button>
        </nav>

        <div className="p-4 border-t-2 border-black bg-gray-50">
          <div className="flex items-center space-x-2 mb-4 px-1">
            <div className="w-8 h-8 rounded-full border border-black bg-[#FF6B57] flex items-center justify-center font-black text-xs">
              {userData?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-black truncate">{userData?.name}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{userData?.subject}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 bg-white border-2 border-black rounded-lg font-black text-xs hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav */}
        <header className="lg:hidden bg-white border-b-2 border-black px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MyMentor Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-lg font-black tracking-tight">Teacher</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`p-2 rounded-lg border-2 transition-all ${activeTab === 'overview' ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <Home className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setActiveTab('classrooms')}
              className={`p-2 rounded-lg border-2 transition-all ${activeTab === 'classrooms' ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg border-2 border-black bg-white text-black hover:bg-red-50 hover:text-red-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto relative bg-[#FAFAFA]" style={{ 
          backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', 
          backgroundSize: '24px 24px' 
        }}>
          <div className="max-w-5xl mx-auto py-8 px-4 lg:px-8">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'classrooms' && renderClassrooms()}
            {activeTab === 'profile' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><Profile /></div>}
          </div>
        </main>
      </div>
    </div>
  );
}
