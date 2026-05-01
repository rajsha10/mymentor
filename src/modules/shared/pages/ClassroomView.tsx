import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function stableClassId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h) % 2_147_483_647 || 1;
}
import ClassDashboard from '../../teacher/components/ClassDashboard';
import LoadingScreen from '../../../components/LoadingScreen';
import { Video } from 'lucide-react';

export default function ClassroomView() {
  const { id } = useParams<{ id: string }>();
  const { user, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('announcements');
  const [defaultTabSet, setDefaultTabSet] = useState(false);
  const [loading, setLoading] = useState(true);

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
  if (!classroom) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]"><h2 className="text-4xl font-black text-black">Classroom not found.</h2></div>;

  const isOwner = classroom.teacherId === user?.uid;

  if (!defaultTabSet) {
    setDefaultTabSet(true);
    if (isOwner) setActiveTab('classdashboard');
  }
  const isTeacher = isOwner || isAdmin;
  
  // Supervisors (Coordinators/Headmasters) can view all classrooms as "Teachers" (Read-Only context in modules)
  // but we pass isTeacher=true to many components to show content, we'll need to handle "Edit Permission" specifically
  // For the purpose of the PRD "Read-only but view all", we treat them as teachers but restrict their upload buttons in modules.
  const isSupervisor = isAdmin || (userData?.role === 'teacher' && ['subject_coordinator', 'head_teacher', 'headmaster'].includes(userData?.designation || ''));

  // Effective teacher role for viewing purposes
  const hasTeacherView = isTeacher || isSupervisor;


  const tabs = [
    ...(isOwner
      ? [{ id: 'classdashboard', name: 'Class Dashboard' }, { id: 'agent', name: 'AI Agent' }, { id: 'tests', name: 'Test Generator' }, { id: 'ai-assignments', name: 'Assignment Generator' }]
      : [{ id: 'ai', name: 'AI Assistant' }, { id: 'mytests', name: 'My Tests' }, { id: 'myassignments', name: 'Assignments' }]),
    { id: 'announcements', name: 'Announcements' },
    { id: 'materials', name: 'Materials' },
    { id: 'homework', name: 'Homework' },
    { id: 'assignments', name: 'Assignments' },
    { id: 'chat', name: 'Group Chat' },
    { id: 'meetings', name: 'Meetings' },
    { id: 'activity', name: 'Activity Log' },
    { id: 'participants', name: 'Participants' },
  ];


  const renderContent = () => {
    switch (activeTab) {
      case 'announcements':
        return <Announcements classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'materials':
        return <Materials classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'homework':
        return <Homework classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'assignments':
        return <Assignments classroomId={classroom.id} isTeacher={hasTeacherView} />;
      case 'chat':
        return <div className="p-6"><GroupChat classroomId={classroom.id} /></div>;
      case 'meetings':
        return <div className="p-6"><Meetings classroom={classroom} isTeacher={hasTeacherView} /></div>;
      case 'participants':
        return <div className="p-6"><Participants classroom={classroom} isTeacher={hasTeacherView} /></div>;
      case 'activity':
        return <div className="p-6"><NotificationsPanel classroomId={classroom.id} /></div>;
      case 'classdashboard':
        return <ClassDashboard classroom={classroom} onNavigateTab={setActiveTab} />;
      case 'agent':
        return <AgentPanel classroomName={classroom.name} classroomId={classroom.classroomId} firestoreId={classroom.id} visibleAgentIds={classroom.visibleAgentIds ?? []} />;
      case 'tests':
        return <TeacherTestGenerator classroomId={classroom.classroomId} firestoreClassroomId={classroom.id} />;
      case 'ai':
        return <StudentAIPanel classroomName={classroom.name} classroomId={classroom.classroomId} visibleAgentIds={classroom.visibleAgentIds ?? []} />;
      case 'mytests':
        return <StudentTestList classId={stableClassId(classroom.id)} />;
      case 'ai-assignments':
        return <TeacherAssignmentGenerator firestoreClassroomId={classroom.id} />;
      case 'myassignments':
        return <StudentAssignmentList classId={stableClassId(classroom.id)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black">
      <nav className="bg-[#FAFAFA] border-b-2 border-black sticky top-0 z-20 pt-4 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-6 py-2">
              <button 
                onClick={() => navigate(-1)}
                className="px-4 py-2 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-colors"
              >
                &larr; Back
              </button>
              <img src="/logo.png" alt="MyMentor Logo" className="h-24 w-auto object-contain hidden sm:block" />
              <h1 className="text-3xl font-extrabold tracking-tight">{classroom.name}</h1>
              {classroom.meetingActive && (
                <div className="flex items-center px-4 py-1.5 bg-[#FF6B57] text-black border-2 border-black rounded-full text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce ml-4">
                  <Video className="h-3 w-3 mr-1" />
                  LIVE
                </div>
              )}
              <span className="ml-4 px-4 py-1.5 rounded-full text-xs font-bold border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                CODE: {classroom.classroomId}
              </span>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="bg-[#FAFAFA] border-b-2 border-black overflow-hidden z-10 sticky top-[80px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 overflow-x-auto py-4 scrollbar-hide items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                } whitespace-nowrap py-3 px-6 rounded-full border-2 border-black font-extrabold text-sm transition-all`}
              >
                {tab.name}
                {tab.id === 'participants' && isTeacher && classroom.pendingRequests?.length > 0 && (
                  <span className="ml-2 bg-[#FF6B57] text-black border border-black py-0.5 px-2 rounded-full text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {classroom.pendingRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white min-h-[500px] rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}




