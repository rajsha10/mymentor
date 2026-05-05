import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import Participants from '../components/Participants';
import GroupChat from '../components/GroupChat';
import Announcements from '../components/Announcements';
import Materials from '../components/Materials';
import Homework from '../components/Homework';
import Assignments from '../components/Assignments';
import Meetings from '../components/Meetings';
import NotificationsPanel from '../components/NotificationsPanel';
import AgentPanel from '../../teacher/components/AgentPanel';
import StudentAIPanel from '../../student/components/StudentAIPanel';
import TeacherTestGenerator from '../../teacher/components/TeacherTestGenerator';
import StudentTestList from '../../student/components/StudentTestList';
import TeacherAssignmentGenerator from '../../teacher/components/TeacherAssignmentGenerator';
import StudentAssignmentList from '../../student/components/StudentAssignmentList';
import ClassDashboard from '../../teacher/components/ClassDashboard';
import LoadingScreen from '../../../components/LoadingScreen';
import {
  Video, Menu, X, LayoutDashboard, Bot, ClipboardList, BookOpen,
  Bell, FolderOpen, BookMarked, CheckSquare, MessageSquare, Activity, Users,
} from 'lucide-react';

function stableClassId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h) % 2_147_483_647 || 1;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  classdashboard:  <LayoutDashboard className="h-4 w-4 shrink-0" />,
  agent:           <Bot className="h-4 w-4 shrink-0" />,
  tests:           <ClipboardList className="h-4 w-4 shrink-0" />,
  'ai-assignments': <BookOpen className="h-4 w-4 shrink-0" />,
  ai:              <Bot className="h-4 w-4 shrink-0" />,
  mytests:         <ClipboardList className="h-4 w-4 shrink-0" />,
  myassignments:   <CheckSquare className="h-4 w-4 shrink-0" />,
  announcements:   <Bell className="h-4 w-4 shrink-0" />,
  materials:       <FolderOpen className="h-4 w-4 shrink-0" />,
  homework:        <BookMarked className="h-4 w-4 shrink-0" />,
  assignments:     <CheckSquare className="h-4 w-4 shrink-0" />,
  chat:            <MessageSquare className="h-4 w-4 shrink-0" />,
  meetings:        <Video className="h-4 w-4 shrink-0" />,
  activity:        <Activity className="h-4 w-4 shrink-0" />,
  participants:    <Users className="h-4 w-4 shrink-0" />,
};

export default function ClassroomView() {
  const { id } = useParams<{ id: string }>();
  const { user, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('announcements');
  const [defaultTabSet, setDefaultTabSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'classrooms', id), (docSnap) => {
      if (docSnap.exists()) {
        setClassroom({ id: docSnap.id, ...docSnap.data() });
      } else {
        setClassroom(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!classroom) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
      <h2 className="text-4xl font-black text-black">Classroom not found.</h2>
    </div>
  );

  const isOwner = classroom.teacherId === user?.uid;

  if (!defaultTabSet) {
    setDefaultTabSet(true);
    if (isOwner) setActiveTab('classdashboard');
  }

  const isTeacher = isOwner || isAdmin;
  const isSupervisor = isAdmin || (userData?.role === 'teacher' && ['subject_coordinator', 'head_teacher', 'headmaster'].includes(userData?.designation || ''));
  const hasTeacherView = isTeacher || isSupervisor;

  const tabs = [
    ...(isOwner
      ? [
          { id: 'classdashboard', name: 'Class Dashboard' },
          { id: 'agent',          name: 'AI Agent' },
          { id: 'tests',          name: 'Test Generator' },
          { id: 'ai-assignments', name: 'Assignment Generator' },
        ]
      : [
          { id: 'ai',            name: 'AI Assistant' },
          { id: 'mytests',       name: 'My Tests' },
          { id: 'myassignments', name: 'Assignments' },
        ]),
    { id: 'announcements', name: 'Announcements' },
    { id: 'materials',     name: 'Materials' },
    { id: 'homework',      name: 'Homework' },
    { id: 'assignments',   name: 'Assignments' },
    { id: 'chat',          name: 'Group Chat' },
    { id: 'meetings',      name: 'Meetings' },
    { id: 'activity',      name: 'Activity Log' },
    { id: 'participants',  name: 'Participants' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'announcements':   return <Announcements classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'materials':       return <Materials classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'homework':        return <Homework classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'assignments':     return <Assignments classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'chat':            return <div className="p-6"><GroupChat classroomId={classroom.id} /></div>;
      case 'meetings':        return <div className="p-6"><Meetings classroom={classroom} isTeacher={hasTeacherView} /></div>;
      case 'participants':    return <div className="p-6"><Participants classroom={classroom} isTeacher={hasTeacherView} /></div>;
      case 'activity':        return <div className="p-6"><NotificationsPanel classroomId={classroom.id} /></div>;
      case 'classdashboard':  return <ClassDashboard classroom={classroom} onNavigateTab={setActiveTab} />;
      case 'agent':           return <AgentPanel classroomName={classroom.name} classroomId={classroom.classroomId} firestoreId={classroom.id} visibleAgentIds={classroom.visibleAgentIds ?? []} />;
      case 'tests':           return <TeacherTestGenerator classroomId={classroom.classroomId} firestoreClassroomId={classroom.id} />;
      case 'ai':              return <StudentAIPanel classroomName={classroom.name} classroomId={classroom.classroomId} visibleAgentIds={classroom.visibleAgentIds ?? []} />;
      case 'mytests':         return <StudentTestList classId={stableClassId(classroom.id)} />;
      case 'ai-assignments':  return <TeacherAssignmentGenerator firestoreClassroomId={classroom.id} />;
      case 'myassignments':   return <StudentAssignmentList classId={stableClassId(classroom.id)} />;
      default:                return null;
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans text-black selection:bg-brand-coral/30">

      {/* ── Top Navigation Bar ── */}
      <nav className="bg-white border-b-2 border-black sticky top-0 z-30 py-2 shadow-[0_2px_0_0_rgba(0,0,0,0.05)]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-11">

            <div className="flex items-center gap-2.5">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="lg:hidden flex items-center justify-center w-9 h-9 bg-white border-2 border-black rounded-xl hover:bg-[#FF6B57] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                aria-label="Toggle navigation"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center w-9 h-9 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                title="Go Back"
              >
                <span className="text-lg font-black group-hover:-translate-x-0.5 transition-transform">&larr;</span>
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-black uppercase">{classroom.name}</h1>
                  {classroom.meetingActive && (
                    <div className="hidden sm:flex items-center px-2.5 py-1 bg-brand-coral text-black border-2 border-black rounded-full text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                      <Video className="h-3 w-3 mr-1" />
                      LIVE
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 border border-black/5 rounded">
                    ID: {classroom.classroomId}
                  </span>
                  {isOwner && (
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 border border-blue-200 rounded">
                      Educator
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/" className="hidden md:block">
                <img src="/logo.png" alt="MyMentor" className="h-9 w-auto object-contain" />
              </Link>
              <div className="h-7 w-px bg-black/10 hidden lg:block rounded-full" />
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-black text-black uppercase tracking-tight">{userData?.name || 'Teacher'}</span>
                  <span className="text-[9px] font-black text-[#FF6B57] uppercase tracking-[0.15em]">{userData?.role || 'Educator'}</span>
                </div>
                <div className="w-9 h-9 border-2 border-black rounded-xl bg-brand-coral/10 flex items-center justify-center font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
                  {userData?.name?.[0] || 'T'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Body (sidebar + content) ── */}
      <div className="flex flex-1 relative overflow-hidden">

        {/* Left Sidebar — all users */}
        <>

            {/* Mobile backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar panel */}
            <aside
              className={`
                fixed top-0 left-0 h-screen w-72
                bg-white border-r-4 border-black
                overflow-y-auto z-50
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                lg:sticky lg:top-[3.75rem] lg:h-[calc(100vh-3.75rem)] lg:z-auto
                lg:ml-4 lg:mt-4 lg:rounded-[2rem] lg:border-y-4 lg:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              `}
            >
              {/* Mobile header */}
              <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b-4 border-black bg-gray-50">
                <span className="font-black text-xs uppercase tracking-[0.2em] text-gray-500">Navigation</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-center w-10 h-10 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Classroom info in sidebar */}
              <div className="px-6 py-6 border-b-4 border-black bg-gray-50/30">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B57] mb-1">Classroom</p>
                <p className="text-base font-black text-black leading-tight uppercase tracking-tight line-clamp-2">{classroom.name}</p>
              </div>

              {/* Tab links */}
              <nav className="flex flex-col gap-2 p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      flex items-center gap-4 w-full px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-left transition-all relative group
                      ${activeTab === tab.id
                        ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] translate-x-1'
                        : 'text-black hover:bg-gray-50 hover:translate-x-1 border-2 border-transparent hover:border-black/10'
                      }
                    `}
                  >
                    <div className={`${activeTab === tab.id ? 'text-[#FF6B57]' : 'text-gray-400 group-hover:text-black'}`}>
                      {TAB_ICONS[tab.id]}
                    </div>
                    <span className="flex-1">{tab.name}</span>
                    {tab.id === 'participants' && classroom.pendingRequests?.length > 0 && (
                      <span className="bg-[#FF6B57] text-black border-2 border-black py-0.5 px-2 rounded-lg text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                        {classroom.pendingRequests.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </aside>
          </>

        {/* Main content area */}
        <main className="flex-1 min-w-0 py-3 sm:py-4 lg:py-5 px-3 sm:px-5 lg:px-7 pb-16">
          <div className="bg-white min-h-[80vh] rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative">
            {/* Main scrollable area */}
            <div className="flex-1 relative overflow-y-auto custom-scrollbar">
              {renderContent()}
            </div>

            {/* Background watermark */}
            <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-10">
               <img src="/logo.png" alt="" className="h-20 w-auto grayscale" />
            </div>
          </div>
        </main>

      </div>

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[20%] left-[-5%] w-[40%] h-[40%] bg-brand-coral/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
