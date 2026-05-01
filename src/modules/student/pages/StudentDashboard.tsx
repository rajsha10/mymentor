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
import { Bell, BookOpen, User, LayoutDashboard, LogOut, Plus, Video, Sparkles, Trophy } from 'lucide-react';

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
      const allClassrooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const userClassrooms = allClassrooms.filter(c =>
        c.students?.some((s: any) => s.uid === user.uid)
      );

      const userPendingClassrooms = allClassrooms.filter(c =>
        c.pendingRequests?.some((p: any) => p.uid === user.uid)
      );

      setClassrooms(userClassrooms);
      setPendingClassrooms(userPendingClassrooms);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => { signOut(auth); };

  const formatLastActivity = (iso: string | null) => {
    if (!iso) return 'No activity yet';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const confidenceDot = (level: string) => {
    if (level === 'High') return '🟢';
    if (level === 'Low') return '🔴';
    return '🟡';
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col font-sans text-black">
      <nav className="bg-brand-light border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <img src="/logo.png" alt="MyMentor Logo" className="h-48 w-auto object-contain" />
              </div>
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`px-5 py-2.5 text-sm font-bold rounded-full flex items-center border border-black transition-colors ${activeTab === 'home' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'}`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-5 py-2.5 text-sm font-bold rounded-full flex items-center border border-black transition-colors ${activeTab === 'profile' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'}`}
                >
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </button>
                <button
                  onClick={() => setActiveTab('agents')}
                  className={`px-5 py-2.5 text-sm font-bold rounded-full flex items-center border border-black transition-colors ${activeTab === 'agents' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]' : 'bg-transparent text-black hover:bg-gray-100'}`}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  My Agents
                </button>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className={`px-5 py-2.5 text-sm font-bold rounded-full flex items-center border border-black transition-colors ${activeTab === 'meetings' ? 'bg-brand-coral text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent text-black hover:bg-gray-100'}`}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Live Classes
                  {classrooms.filter(c => c.meetingActive).length > 0 && (
                    <span className="ml-2 bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                      {classrooms.filter(c => c.meetingActive).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-5 py-2.5 text-sm font-bold rounded-full flex items-center border border-black transition-colors ${activeTab === 'leaderboard' ? 'bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent text-black hover:bg-gray-100'}`}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-black">{userData?.name}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Student</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full border border-black flex items-center justify-center hover:bg-brand-coral hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
        {activeTab === 'profile' ? (
          <Profile />
        ) : activeTab === 'agents' ? (
          <PersonalAgentPanel />
        ) : activeTab === 'leaderboard' ? (
          <div className="max-w-3xl mx-auto">
            <Leaderboard
              classrooms={classrooms.map(c => ({
                id: c.id,
                name: c.name,
                subject: c.subject,
                students: c.students ?? [],
              }))}
              currentUserId={user?.uid ?? ''}
            />
          </div>
        ) : activeTab === 'meetings' ? (
          <div className="space-y-8">
            <h2 className="text-6xl tracking-tight font-extrabold text-black">Live Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {classrooms.filter(c => c.meetingActive).length > 0 ? (
                classrooms.filter(c => c.meetingActive).map(classroom => (
                  <div key={classroom.id} className="bg-white p-8 rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <div className="absolute -top-3 -right-3 z-10">
                      <span className="flex items-center px-4 py-2 bg-brand-coral text-black border-2 border-black rounded-full text-xs font-extrabold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                        <Video className="h-3 w-3 mr-1" />
                        Live Now
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-gray-100 rounded-full text-black border border-black">
                          <Video className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-extrabold text-black">{classroom.name}</h3>
                          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{classroom.subject}</p>
                        </div>
                      </div>
                      <p className="text-base text-gray-600 mb-8 font-medium">Your teacher has started a live session. Join now to participate.</p>
                    </div>
                    <a
                      href={classroom.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-6 py-4 border-2 border-black text-lg font-bold rounded-full text-white bg-black hover:bg-gray-800 transition-colors"
                    >
                      Join Meeting Now
                    </a>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 bg-white rounded-4xl border-2 border-black border-dashed text-center flex flex-col items-center justify-center px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-black mb-4">
                    <Video className="h-8 w-8 text-black" />
                  </div>
                  <p className="text-xl font-bold text-black mb-2">No live classes</p>
                  <p className="text-gray-500 font-medium">There are no live sessions currently in progress.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">

            {/* ── ROW 1: Welcome + Stats bar ─────────────────────────────── */}
            <div className="bg-black text-white rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-3xl font-extrabold tracking-tight">Welcome back, {userData?.name?.split(' ')[0]} 👋</p>
                <p className="text-gray-400 text-sm font-medium mt-1">Here's your learning snapshot for today.</p>
              </div>
              <div className="flex flex-wrap gap-4 sm:shrink-0">
                <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center min-w-25">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Confidence</p>
                  <p className="text-lg font-extrabold">
                    {insightsLoading ? '…' : insights ? `${confidenceDot(insights.overall_confidence)} ${insights.overall_confidence}` : '—'}
                  </p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center min-w-25">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Last Active</p>
                  <p className="text-lg font-extrabold">
                    {insightsLoading ? '…' : insights ? formatLastActivity(insights.last_activity) : '—'}
                  </p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center min-w-25">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Queries</p>
                  <p className="text-lg font-extrabold">
                    {insightsLoading ? '…' : insights ? insights.total_queries : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Score section — empty state OR dashboard + graph ─── */}
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

            {/* ── ROW 4: Weak Areas Dashboard ─────────────────────────────── */}
            <WeakAreasDashboard
              insights={insights ?? { by_classroom: [], total_queries: 0 }}
              classrooms={classrooms}
              loading={insightsLoading}
            />

            {/* ── ROW 5: Classrooms (left) + Right column ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

              {/* Classrooms — 2/3 width */}
              <div className="lg:col-span-2 space-y-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <h2 className="text-4xl tracking-tight font-extrabold text-black">My Classrooms</h2>
                  <button
                    onClick={() => setShowJoin(!showJoin)}
                    className="inline-flex items-center px-6 py-3 bg-brand-coral text-black text-sm font-bold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showJoin ? 'Cancel' : 'Join Classroom'}
                  </button>
                </div>

                {showJoin && (
                  <div className="p-8 bg-white border-2 border-black rounded-4xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <JoinClassroom onJoined={() => setShowJoin(false)} />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {classrooms.map((classroom) => (
                    <Link
                      key={classroom.id}
                      to={`/classroom/${classroom.id}`}
                      className="group bg-white p-7 rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 flex items-center justify-center bg-gray-100 rounded-full border border-black group-hover:bg-brand-coral transition-colors">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            {classroom.meetingActive && (
                              <div className="flex items-center px-3 py-1 bg-brand-coral text-black border border-black rounded-full text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Video className="h-3 w-3 mr-1" />
                                Live
                              </div>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded-full border border-gray-300 text-xs font-bold font-mono text-gray-400">
                            {classroom.classroomId}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-black mb-1">{classroom.name}</h3>
                        <p className="text-gray-500 text-sm font-medium">Teacher: {classroom.teacherName || 'Faculty'}</p>
                      </div>
                      <div className="mt-6 pt-5 border-t-2 border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-black border-b-2 border-transparent group-hover:border-black transition-colors pb-0.5">Open →</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 text-gray-600">{classroom.subject}</span>
                      </div>
                    </Link>
                  ))}

                  {pendingClassrooms.map((classroom) => (
                    <div
                      key={`pending-${classroom.id}`}
                      className="bg-brand-light p-7 rounded-4xl border-2 border-black border-dashed opacity-80 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-[#FFF9C4] border-b-2 border-l-2 border-black px-4 py-1 rounded-bl-2xl font-bold text-xs uppercase tracking-wider">
                        Pending Approval
                      </div>
                      <div>
                        <div className="w-11 h-11 flex items-center justify-center bg-gray-200 rounded-full border border-black mb-5">
                          <BookOpen className="h-5 w-5 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-700 mb-1">{classroom.name}</h3>
                        <p className="text-gray-500 text-sm font-medium mb-4">Teacher: {classroom.teacherName || 'Faculty'}</p>
                        <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 text-sm font-medium text-gray-600">
                          <span className="block font-bold mb-1 text-black">Waiting for Access</span>
                          Please contact {classroom.teacherName || 'your teacher'} to approve your request.
                        </div>
                      </div>
                    </div>
                  ))}

                  {classrooms.length === 0 && pendingClassrooms.length === 0 && !showJoin && (
                    <div className="col-span-full py-16 bg-white rounded-4xl border-2 border-black border-dashed flex flex-col items-center justify-center text-center px-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-black mb-4">
                        <BookOpen className="h-8 w-8 text-black" />
                      </div>
                      <p className="text-xl font-bold text-black mb-2">Not enrolled yet</p>
                      <p className="text-gray-500 font-medium">Click "Join Classroom" to enter your first class.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column — Activity + Notifications */}
              <div className="lg:col-span-1 space-y-6 sticky top-24 self-start">
                <ActivityTimeline />

                <div className="bg-white rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="p-6 border-b-2 border-black flex items-center bg-brand-light">
                    <Bell className="h-5 w-5 mr-3 text-black" />
                    <h3 className="text-base font-extrabold text-black">Recent Updates</h3>
                  </div>
                  <div className="max-h-100 overflow-y-auto p-2">
                    <NotificationsPanel classroomIds={classrooms.map(c => c.id)} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
