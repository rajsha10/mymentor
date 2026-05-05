import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { auth, db } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import JoinClassroom from '../components/JoinClassroom';
import NotificationsPanel from '../../shared/components/NotificationsPanel';
import Profile from '../../shared/pages/Profile';
import PersonalAgentPanel from './PersonalAgentPanel';
import ScoreDashboard from '../components/ScoreDashboard';
import ScoreGraph from '../components/ScoreGraph';
import WeakAreasDashboard from '../components/WeakAreasDashboard';
import EmptyLearningProfile from '../components/EmptyLearningProfile';
import ActivityTimeline from '../components/ActivityTimeline';
import Leaderboard from '../components/Leaderboard';
import { getLearningInsights } from '../../../services/backendApi';
import {
  Bell, BookOpen, User, LayoutDashboard, LogOut, Plus, Video,
  Sparkles, Trophy, ChevronRight, X, Clock, Menu, Activity,
} from 'lucide-react';

type LearningInsights = {
  by_classroom: {
    classroom_id: string;
    weak_areas: { topic: string; total_queries: number; low_confidence_count: number; weak_score: number }[];
    query_count: number;
  }[];
  overall_confidence: 'High' | 'Medium' | 'Low';
  last_activity: string | null;
  total_queries: number;
};

export default function StudentDashboard() {
  const { user, userData } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [pendingClassrooms, setPendingClassrooms] = useState<any[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'meetings' | 'agents' | 'profile' | 'leaderboard'>('home');
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setInsightsLoading(true);
    getLearningInsights()
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'classrooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setClassrooms(all.filter(c => c.students?.some((s: any) => s.uid === user.uid)));
      setPendingClassrooms(all.filter(c => c.pendingRequests?.some((p: any) => p.uid === user.uid)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => { signOut(auth); };

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const formatLastActivity = (iso: string | null) => {
    if (!iso) return 'No activity';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const confidenceDot = (level: string) => {
    if (level === 'High') return '🟢';
    if (level === 'Low') return '🔴';
    return '🟡';
  };

  const liveCount = classrooms.filter(c => c.meetingActive).length;

  const bottomNavTabs = [
    { id: 'home' as const,        label: 'Home',     Icon: LayoutDashboard },
    { id: 'agents' as const,      label: 'Agents',   Icon: Sparkles },
    { id: 'meetings' as const,    label: 'Live',     Icon: Video },
    { id: 'leaderboard' as const, label: 'Ranks',    Icon: Trophy },
    { id: 'profile' as const,     label: 'Profile',  Icon: User },
  ];

  const desktopNavTabs = [
    { id: 'home' as const,        label: 'Dashboard',    Icon: LayoutDashboard },
    { id: 'profile' as const,     label: 'Profile',      Icon: User },
    { id: 'agents' as const,      label: 'My Agents',    Icon: Sparkles },
    { id: 'meetings' as const,    label: 'Live Classes', Icon: Video },
    { id: 'leaderboard' as const, label: 'Leaderboard',  Icon: Trophy },
  ];

  /* ─────────────────────────── Sidebar ─────────────────────── */

  const sidebar = (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-80
          lg:sticky lg:top-[7.75rem] lg:h-[calc(100vh-9.5rem)] lg:mt-[1.75rem] lg:self-start lg:z-auto lg:translate-x-0
          bg-white border-r-4 border-black flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:rounded-r-[2rem] lg:border-y-4 lg:ml-6 lg:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        `}
      >
        {/* ── Header ─────────────────────────── */}
        <div className="px-6 py-5 border-b-4 border-black shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-black text-black tracking-tight">My Classes</span>
              {classrooms.length > 0 && (
                <span className="px-2.5 py-1 bg-[#FF6B57] border-2 border-black rounded-full text-[10px] font-black leading-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {classrooms.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJoin(!showJoin)}
                className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                  showJoin ? 'bg-black text-white' : 'bg-white hover:bg-[#FF6B57]'
                }`}
                title={showJoin ? 'Cancel' : 'Join a classroom'}
              >
                {showJoin ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
              {/* Close button — mobile only */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center bg-white hover:bg-gray-100 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Inline join form */}
          {showJoin && (
            <div className="mt-2 p-1">
              <JoinClassroom onJoined={() => setShowJoin(false)} />
            </div>
          )}
        </div>

        {/* ── Classroom list ──────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {classrooms.length === 0 && pendingClassrooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-[#FAFAFA] border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-black text-gray-400 mb-1">No classrooms yet</p>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">
                Tap the <Plus className="inline h-3 w-3" /> above to join your first class.
              </p>
            </div>
          ) : (
            <>
              {classrooms.map(c => (
                <Link
                  key={c.id}
                  to={`/classroom/${c.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="group flex items-center gap-4 px-4 py-4 rounded-[1.25rem] border-2 border-black bg-white hover:bg-[#FF6B57]/5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none"
                >
                  <div className="w-11 h-11 shrink-0 bg-[#FF6B57]/10 border-2 border-black rounded-xl flex items-center justify-center group-hover:bg-[#FF6B57] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <BookOpen className="h-5 w-5 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-black truncate leading-tight uppercase tracking-tight">{c.name}</span>
                      {c.meetingActive && (
                        <span className="shrink-0 w-2.5 h-2.5 bg-[#FF6B57] rounded-full border-2 border-black animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{c.subject}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-black shrink-0 transition-colors" />
                </Link>
              ))}

              {pendingClassrooms.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-3 pt-4 pb-2">
                    <div className="flex-1 h-0.5 bg-gray-100" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pending</span>
                    <div className="flex-1 h-0.5 bg-gray-100" />
                  </div>
                  {pendingClassrooms.map(c => (
                    <div key={`p-${c.id}`} className="flex items-center gap-4 px-4 py-4 rounded-[1.25rem] border-2 border-dashed border-gray-300 bg-gray-50/50 opacity-70">
                      <div className="w-11 h-11 shrink-0 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-sm text-gray-500 truncate block leading-tight uppercase tracking-tight">{c.name}</span>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Awaiting approval</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ── Live banner ─────────────────────── */}
        {liveCount > 0 && (
          <div className="p-4 border-t-2 border-black/5">
            <div
              onClick={() => { switchTab('meetings'); }}
              className="flex items-center gap-4 px-5 py-4 bg-[#FF6B57] border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-[#FF8A7A] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none"
            >
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]">
                <Video className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-black leading-tight uppercase tracking-tight">
                  {liveCount} Live Session{liveCount > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mt-0.5">Tap to join</p>
              </div>
              <ChevronRight className="h-5 w-5 text-black shrink-0" />
            </div>
          </div>
        )}
      </aside>
    </>
  );

  /* ─────────────────────────── Render ──────────────────────── */

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black">

      {/* ── Top Navigation ─────────────────────────────────────── */}
      <nav className="bg-white border-b-4 border-black sticky top-0 z-30 shadow-[0_4px_0_0_rgba(0,0,0,0.05)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-24">

            {/* Left: hamburger (mobile) + logo + desktop tabs */}
            <div className="flex items-center gap-4 lg:gap-8">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center hover:bg-[#FF6B57] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                aria-label="Open classrooms"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <Link to="/" className="shrink-0">
                <img src="/logo.png" alt="MyMentor" className="h-44 sm:h-52 w-auto object-contain" />
              </Link>

              {/* Desktop tab pills */}
              <div className="hidden lg:flex items-center gap-2 bg-gray-100/50 border-2 border-black rounded-2xl p-1.5">
                {desktopNavTabs.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => switchTab(id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      activeTab === id
                        ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] translate-x-0.5'
                        : 'text-gray-500 hover:bg-white hover:text-black hover:border-black border-2 border-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {id === 'meetings' && liveCount > 0 && (
                      <span className="bg-[#FF6B57] text-black w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center border-2 border-black animate-pulse ml-1">
                        {liveCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: user info + avatar + logout */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-black leading-tight text-black uppercase tracking-tight">{userData?.name}</span>
                <span className="text-[10px] font-black text-[#FF6B57] uppercase tracking-[0.2em] mt-0.5">Academic Student</span>
              </div>
              <div className="relative group">
                <div className="w-12 h-12 rounded-2xl bg-[#FF6B57] border-2 border-black flex items-center justify-center font-black text-lg text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
                  {userData?.name?.charAt(0)?.toUpperCase() ?? 'S'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center hover:bg-[#FF6B57] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────────────── */}
      {activeTab === 'home' ? (

        <div className="flex flex-1 relative">
          {/* Left sidebar */}
          {sidebar}

          {/* Main content */}
          <div className="flex-1 pb-32 lg:pb-12">
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-8 lg:px-12 space-y-8 lg:space-y-12">

              {/* Welcome hero */}
              <div className="relative bg-black text-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(255,107,87,1)] overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#FF6B57 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
                
                <div className="relative p-6 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B57] text-black border-2 border-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                      <Sparkles className="h-3 w-3" />
                      Learning Active
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[1.1] mb-3">
                      Hey, {userData?.name?.split(' ')[0]}! <span className="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base font-bold max-w-md leading-relaxed">
                      Your learning journey is looking great today. Here's a quick look at your progress.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 md:flex gap-3 sm:gap-4 shrink-0">
                    {[
                      { label: 'Confidence', val: insightsLoading ? '...' : insights ? `${confidenceDot(insights.overall_confidence)} ${insights.overall_confidence}` : '—', color: 'text-white' },
                      { label: 'Last Active', val: insightsLoading ? '...' : insights ? formatLastActivity(insights.last_activity) : '—', color: 'text-white' },
                      { label: 'Queries', val: insightsLoading ? '...' : insights ? insights.total_queries : '—', color: 'text-[#FF6B57]' },
                    ].map((stat, i) => (
                      <div key={i} className="flex-1 md:w-32 bg-white/10 border-2 border-white/20 rounded-2xl p-3 sm:p-4 text-center backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{stat.label}</p>
                        <p className={`text-sm sm:text-base font-black leading-none ${stat.color}`}>{stat.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Learning analytics section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Performance Overview</h2>
                </div>
                
                {insightsLoading ? (
                  <ScoreDashboard insights={{ by_classroom: [], overall_confidence: 'Medium', last_activity: null, total_queries: 0 }} loading={true} />
                ) : insights && insights.total_queries > 0 ? (
                  <div className="grid grid-cols-1 gap-6 lg:gap-8">
                    <ScoreDashboard insights={insights} loading={false} />
                    <div className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8">
                      <ScoreGraph />
                    </div>
                  </div>
                ) : (
                  <EmptyLearningProfile name={userData?.name?.split(' ')[0]} />
                )}
              </div>

              {/* Weak areas */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Focus Areas</h2>
                </div>
                <WeakAreasDashboard
                  insights={insights ?? { by_classroom: [], total_queries: 0 }}
                  classrooms={classrooms}
                  loading={insightsLoading}
                />
              </div>

              {/* Activity + Notifications */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-7 space-y-6">
                  <ActivityTimeline />
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-full flex flex-col">
                    <div className="px-6 py-5 border-b-4 border-black flex items-center gap-3 bg-gray-50/50">
                      <div className="w-10 h-10 bg-black border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-tight">Recent Updates</h3>
                    </div>
                    <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                      <NotificationsPanel classroomIds={classrooms.map(c => c.id)} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      ) : (

        /* ── Full-width tabs ─────────────────────────────────────── */
        <main className="flex-1 max-w-[1400px] mx-auto w-full py-8 sm:py-12 px-4 sm:px-8 lg:px-12 pb-32 lg:pb-12">

          {activeTab === 'profile' ? (
            <div className="max-w-4xl mx-auto">
              <Profile />
            </div>

          ) : activeTab === 'agents' ? (
            <PersonalAgentPanel />

          ) : activeTab === 'leaderboard' ? (
            <div className="max-w-4xl mx-auto">
              <Leaderboard
                classrooms={classrooms.map(c => ({ id: c.id, name: c.name, subject: c.subject, students: c.students ?? [] }))}
                currentUserId={user?.uid ?? ''}
              />
            </div>

          ) : activeTab === 'meetings' ? (
            <div className="space-y-10">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b-4 border-black">
                <div className="w-16 h-16 bg-[#FF6B57] border-4 border-black rounded-[1.5rem] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  <Video className="h-8 w-8 text-black" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter uppercase">Live Classes</h1>
                  <p className="text-sm sm:text-base font-bold text-gray-500 mt-1 uppercase tracking-wide">Join active sessions from your classrooms</p>
                </div>
                {liveCount > 0 && (
                  <div className="sm:ml-auto px-6 py-2 bg-[#FF6B57] border-4 border-black rounded-full text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-black rounded-full" />
                    {liveCount} Active Now
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {liveCount > 0 ? (
                  classrooms.filter(c => c.meetingActive).map(classroom => (
                    <div key={classroom.id} className="bg-white rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col hover:-translate-y-2 transition-all group relative">
                      <div className="h-3 bg-[#FF6B57] border-b-4 border-black" />
                      <div className="p-8 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-14 h-14 bg-gray-50 border-2 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <BookOpen className="h-6 w-6 text-black" />
                          </div>
                          <span className="flex items-center gap-2 px-3 py-1.5 bg-[#FF6B57] text-black border-2 border-black rounded-full text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
                            Live
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black mb-1 uppercase tracking-tight">{classroom.name}</h3>
                        <p className="text-xs font-black text-[#FF6B57] uppercase tracking-[0.2em] mb-4">{classroom.subject}</p>
                        <p className="text-sm text-gray-500 font-bold mb-8 leading-relaxed">Your teacher has started a live session. Join now to participate in the real-time discussion.</p>
                        
                        <a
                          href={classroom.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto flex items-center justify-center gap-3 px-6 py-4 bg-black text-white font-black rounded-2xl border-2 border-black hover:bg-[#FF6B57] hover:text-black transition-all shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                        >
                          <Video className="h-5 w-5" />
                          JOIN CLASSROOM
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 sm:py-32 bg-white rounded-[3rem] border-4 border-dashed border-black/20 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-black/20 rounded-full flex items-center justify-center mb-6">
                      <Video className="h-10 w-10 text-gray-300" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-3">Quiet in the Halls...</h2>
                    <p className="text-gray-400 font-bold max-w-sm text-sm sm:text-base leading-relaxed">When your teacher starts a live session, it'll pop up here with a notification. Check back soon!</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      )}

      {/* ── Mobile bottom navigation bar ───────────────────────── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white border-4 border-black rounded-[2rem] shadow-[0_8px_0_0_rgba(0,0,0,1)] z-40 lg:hidden px-4">
        <div className="flex items-center justify-between h-16">
          {bottomNavTabs.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`flex flex-col items-center justify-center transition-all relative px-2 ${
                activeTab === id ? 'scale-110' : 'opacity-40'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === id ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]' : 'text-black'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              {/* Live badge on the meetings icon */}
              {id === 'meetings' && liveCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#FF6B57] rounded-full border-2 border-black animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
