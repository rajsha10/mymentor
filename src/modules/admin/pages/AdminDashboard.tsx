import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { auth } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import PendingTeachers from '../components/PendingTeachers';
import RoleAssignment from '../components/RoleAssignment';
import TeachersPanel from '../components/TeachersPanel';
import StudentsPanel from '../components/StudentsPanel';
import ClassroomsPanel from '../components/ClassroomsPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  LogOut, 
  BookOpen, 
  Menu, 
  X,
  Bell,
  Search
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'pending', label: 'Pending', icon: UserPlus },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'classrooms', label: 'Classrooms', icon: BookOpen },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: Activity },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return <PendingTeachers />;
      case 'roles':
        return <RoleAssignment />;
      case 'teachers':
        return <TeachersPanel />;
      case 'students':
        return <StudentsPanel />;
      case 'classrooms':
        return <ClassroomsPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'overview':
      default:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tight mb-1">
                  Welcome back, Admin
                </h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  System Overview & Control Center
                </p>
              </div>
              <div className="flex bg-white border-2 border-black rounded-2xl p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="px-4 py-1 border-r-2 border-black">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Status</p>
                  <p className="text-xs font-black text-green-500">ONLINE</p>
                </div>
                <div className="px-4 py-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Load</p>
                  <p className="text-xs font-black text-black">OPTIMAL</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FF6B57] p-6 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <h3 className="text-xl font-black text-black mb-3">Global Authority</h3>
                <p className="text-black font-bold text-base leading-relaxed">
                  You have full administrative control. Approve educators, manage student transitions, and oversee all academic materials.
                </p>
                <button 
                  onClick={() => setActiveTab('pending')}
                  className="mt-6 bg-black text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-white hover:text-black transition-colors border-2 border-black"
                >
                  Review Pending
                </button>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <h3 className="text-xl font-black text-black mb-3">Real-time Core</h3>
                <p className="text-gray-700 font-bold text-base leading-relaxed">
                  Powered by Firebase Engine. Updates propagate instantly to all active student and teacher sessions.
                </p>
                <div className="mt-6 flex items-center space-x-3">
                  <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse border-2 border-black"></span>
                  <span className="text-sm font-black uppercase tracking-wider">Live Sync Active</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <AnalyticsPanel />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black selection:bg-[#FF6B57] selection:text-white">
      {/* Top Navigation */}
      <nav className="bg-[#FAFAFA] border-b-2 border-black sticky top-0 z-50 px-4">
        <div className="max-w-[1400px] mx-auto flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="MyMentor Logo" className="h-10 w-auto object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-black tracking-tighter leading-none">MYMENTOR</h1>
                <p className="text-[10px] font-black text-[#FF6B57] uppercase tracking-widest">Admin</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="hidden md:flex items-center bg-white border-2 border-black rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Search className="text-gray-400 mr-2" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none focus:outline-none font-bold text-xs w-32"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF6B57] hover:text-white transition-all">
                <Bell size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 border-2 border-black rounded-xl bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] transition-all group"
                title="Logout"
              >
                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1400px] w-full mx-auto px-4 py-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <nav className="space-y-2 sticky top-24">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  group flex items-center px-5 py-3 text-sm font-black rounded-2xl w-full border-2 border-black transition-all
                  ${activeTab === item.id 
                    ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]' 
                    : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
                `}
              >
                <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? 'text-[#FF6B57]' : 'text-black'}`} />
                {item.label}
              </button>
            ))}
            
            <div className="mt-8 p-5 bg-[#FFF9C4] border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="font-black text-xs mb-1 flex items-center">
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Security Tip
              </h4>
              <p className="text-[11px] font-bold text-gray-700 leading-relaxed">
                Always logout from public devices. Sessions expire in 24h.
              </p>
            </div>
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMobileMenuOpen(false)}></div>
            <nav className="fixed top-0 left-0 bottom-0 w-64 bg-[#FAFAFA] border-r-2 border-black p-6 flex flex-col space-y-2 animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black tracking-tight">MENU</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 border-2 border-black rounded-lg">
                  <X size={18} />
                </button>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    group flex items-center px-4 py-2.5 text-sm font-black rounded-xl w-full border-2 border-black transition-all
                    ${activeTab === item.id 
                      ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]' 
                      : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}
                  `}
                >
                  <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? 'text-[#FF6B57]' : 'text-black'}`} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        <main className="flex-1 min-w-0 pb-12">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}


