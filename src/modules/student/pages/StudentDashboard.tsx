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
  Sparkles, Trophy, ChevronRight, X, Clock, Menu,
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-72
          lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:z-auto lg:translate-x-0
          bg-white border-r-2 border-black flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Header ─────────────────────────── */}
        <div className="px-5 py-4 border-b-2 border-black shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-black border-2 border-black rounded-lg flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-extrabold text-black">My Classrooms</span>
              {classrooms.length > 0 && (
                <span className="px-2 py-0.5 bg-[#FF6B57] border-2 border-black rounded-full text-[10px] font-extrabold leading-none">
                  {classrooms.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowJoin(!showJoin)}
                className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center transition-colors ${
                  showJoin ? 'bg-black text-white' : 'hover:bg-[#FF6B57]'
                }`}
                title={showJoin ? 'Cancel' : 'Join a classroom'}
              >
                {showJoin ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
              {/* Close button — mobile only */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden w-7 h-7 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Inline join form */}
          {showJoin && (
            <div className="mt-3 p-4 bg-[#FAFAFA] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <JoinClassroom onJoined={() => setShowJoin(false)} />
            </div>
          )}
        </div>

        {/* ── Classroom list ──────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {classrooms.length === 0 && pendingClassrooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 bg-[#FAFAFA] border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-xs font-extrabold text-gray-400 mb-1">No classrooms yet</p>
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                Tap <span className="font-bold">+</span> above to join your first class.
              </p>
            </div>
          ) : (
            <>
              {classrooms.map(c => (
                <Link
                  key={c.id}
                  to={`/classroom/${c.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-transparent hover:border-black hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="w-9 h-9 shrink-0 bg-[#FF6B57]/10 border-2 border-black rounded-xl flex items-center justify-center group-hover:bg-[#FF6B57] transition-colors">
                    <BookOpen className="h-4 w-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-black truncate leading-tight">{c.name}</span>
                      {c.meetingActive && (
                        <span className="shrink-0 w-2 h-2 bg-[#FF6B57] rounded-full border border-black animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{c.subject}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-black shrink-0 transition-colors" />
                </Link>
              ))}

              {pendingClassrooms.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Pending</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {pendingClassrooms.map(c => (
                    <div key={`p-${c.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl opacity-60">
                      <div className="w-9 h-9 shrink-0 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-sm text-gray-500 truncate block leading-tight">{c.name}</span>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Awaiting approval</p>
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
          <div
            onClick={() => { switchTab('meetings'); }}
            className="m-3 flex items-center gap-3 px-4 py-3 bg-[#FF6B57] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-[#FF8A7A] transition-colors"
          >
            <span className="w-2.5 h-2.5 bg-black rounded-full animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-black leading-tight">
                {liveCount} Live Session{liveCount > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] font-bold text-black/60">Tap to join</p>
            </div>
            <ChevronRight className="h-4 w-4 text-black shrink-0" />
          </div>
        )}
      </aside>
    </>
  );

  /* ─────────────────────────── Render ──────────────────────── */

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black">

      {/* ── Top Navigation ─────────────────────────────────────── */}
      <nav className="bg-white border-b-2 border-black sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">

            {/* Left: hamburger (mobile, home tab) + logo + desktop tabs */}
            <div className="flex items-center gap-2">
              {activeTab === 'home' && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-full border-2 border-black flex items-center justify-center hover:bg-[#FF6B57] transition-colors shrink-0"
                  aria-label="Open classrooms"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}
              <img src="/logo.png" alt="MyMentor" className="h-48 w-auto object-contain" />
              {/* Desktop tab pills */}
              <div className="hidden lg:flex items-center gap-1 bg-[#FAFAFA] border-2 border-black rounded-full p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)]">
                {desktopNavTabs.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => switchTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      activeTab === id
                        ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
                        : 'text-gray-500 hover:bg-white hover:text-black'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {id === 'meetings' && liveCount > 0 && (
                      <span className="bg-[#FF6B57] text-black w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center border border-black animate-pulse">
                        {liveCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: user info + avatar + logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-extrabold leading-tight text-black">{userData?.name}</span>
                <span className="text-[10px] font-extrabold text-[#FF6B57] uppercase tracking-widest">Student</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#FF6B57] border-2 border-black flex items-center justify-center font-extrabold text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {userData?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center hover:bg-[#FF6B57] transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────────────── */}
      {activeTab === 'home' ? (

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          {sidebar}

          {/* Main scrollable content */}
          <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-10 space-y-6 lg:space-y-8">

              {/* Welcome hero */}
              <div className="relative bg-black text-white rounded-[1.5rem] sm:rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] sm:shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 bg-[#FF6B57]" />
                <div className="p-5 pl-7 sm:p-8 sm:pl-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  <div>
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#FF6B57] mb-1.5 sm:mb-2">Welcome back</p>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                      {userData?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2">Here's your learning overview for today</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3 sm:shrink-0">
                    <div className="flex-1 sm:flex-none bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                      <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1 sm:mb-2">Confidence</p>
                      <p className="text-sm sm:text-base font-extrabold leading-none">
                        {insightsLoading ? '…' : insights ? `${confidenceDot(insights.overall_confidence)} ${insights.overall_confidence}` : '—'}
                      </p>
                    </div>
                    <div className="flex-1 sm:flex-none bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                      <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1 sm:mb-2">Last Active</p>
                      <p className="text-sm sm:text-base font-extrabold leading-none">
                        {insightsLoading ? '…' : insights ? formatLastActivity(insights.last_activity) : '—'}
                      </p>
                    </div>
                    <div className="flex-1 sm:flex-none bg-[#FF6B57]/20 border border-[#FF6B57]/40 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center">
                      <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B57] mb-1 sm:mb-2">Queries</p>
                      <p className="text-sm sm:text-base font-extrabold leading-none">
                        {insightsLoading ? '…' : insights ? insights.total_queries : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning analytics */}
              {insightsLoading ? (
                <ScoreDashboard insights={{ by_classroom: [], overall_confidence: 'Medium', last_activity: null, total_queries: 0 }} loading={true} />
              ) : insights && insights.total_queries > 0 ? (
                <>
                  <ScoreDashboard insights={insights} loading={false} />
                  <ScoreGraph />
                </>
              ) : (
                <EmptyLearningProfile name={userData?.name?.split(' ')[0]} />
              )}

              {/* Weak areas */}
              <WeakAreasDashboard
                insights={insights ?? { by_classroom: [], total_queries: 0 }}
                classrooms={classrooms}
                loading={insightsLoading}
              />

              {/* Activity + Notifications */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                <ActivityTimeline />
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b-2 border-black flex items-center gap-2.5 bg-[#FAFAFA]">
                    <div className="w-7 h-7 bg-black border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                      <Bell className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-extrabold">Recent Updates</h3>
                  </div>
                  <div className="max-h-72 sm:max-h-80 overflow-y-auto">
                    <NotificationsPanel classroomIds={classrooms.map(c => c.id)} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      ) : (

        /* ── Full-width tabs ─────────────────────────────────────── */
        <main className="flex-1 max-w-7xl mx-auto w-full py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-10">

          {activeTab === 'profile' ? (
            <Profile />

          ) : activeTab === 'agents' ? (
            <PersonalAgentPanel />

          ) : activeTab === 'leaderboard' ? (
            <div className="max-w-3xl mx-auto">
              <Leaderboard
                classrooms={classrooms.map(c => ({ id: c.id, name: c.name, subject: c.subject, students: c.students ?? [] }))}
                currentUserId={user?.uid ?? ''}
              />
            </div>

          ) : activeTab === 'meetings' ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b-2 border-black">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF6B57] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Live Classes</h1>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Join active sessions from your classrooms</p>
                </div>
                {liveCount > 0 && (
                  <span className="ml-auto px-3 sm:px-4 py-1.5 bg-[#FF6B57] border-2 border-black rounded-full text-xs sm:text-sm font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse shrink-0">
                    {liveCount} Live
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {liveCount > 0 ? (
                  classrooms.filter(c => c.meetingActive).map(classroom => (
                    <div key={classroom.id} className="bg-white rounded-[1.75rem] sm:rounded-[2rem] border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col hover:-translate-y-1 transition-all relative">
                      <div className="h-1.5 bg-[#FF6B57]" />
                      <div className="absolute top-4 right-4">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FF6B57] text-black border-2 border-black rounded-full text-xs font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                          Live
                        </span>
                      </div>
                      <div className="p-6 sm:p-7 flex flex-col flex-1">
                        <div className="w-11 h-11 bg-[#FAFAFA] border-2 border-black rounded-xl flex items-center justify-center mb-4">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold mb-1">{classroom.name}</h3>
                        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">{classroom.subject}</p>
                        <p className="text-sm text-gray-500 font-medium mt-2 mb-5">Your teacher has started a live session.</p>
                        <a
                          href={classroom.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 bg-black text-white font-extrabold rounded-full border-2 border-black hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]"
                        >
                          <Video className="h-4 w-4" />
                          Join Meeting
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 sm:py-24 bg-white rounded-[2rem] border-2 border-dashed border-black flex flex-col items-center justify-center text-center px-6 sm:px-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FAFAFA] border-2 border-black rounded-full flex items-center justify-center mb-5">
                      <Video className="h-7 w-7 sm:h-8 sm:w-8 text-gray-300" />
                    </div>
                    <p className="text-xl sm:text-2xl font-extrabold mb-2">No Live Sessions Right Now</p>
                    <p className="text-gray-500 font-medium max-w-xs text-sm">When your teacher starts a live class, it will appear here instantly.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      )}

      {/* ── Mobile bottom navigation bar ───────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-20 lg:hidden">
        <div className="flex items-stretch justify-around">
          {bottomNavTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 transition-colors relative ${
                activeTab === id ? 'text-black' : 'text-gray-400'
              }`}
            >
              {/* Active top indicator */}
              {activeTab === id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF6B57] rounded-full" />
              )}
              <div className="relative">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  activeTab === id ? 'bg-black text-white' : 'text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                {/* Live badge on the meetings icon */}
                {id === 'meetings' && liveCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6B57] rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-wide leading-none ${
                activeTab === id ? 'text-black' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
