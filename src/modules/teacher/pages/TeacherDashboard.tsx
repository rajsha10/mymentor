import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { auth, db } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import CreateClassroom from '../components/CreateClassroom';
import NotificationsPanel from '../../shared/components/NotificationsPanel';
import Profile from '../../shared/pages/Profile';
import { Bell, BookOpen, User, LayoutDashboard, LogOut, Video } from 'lucide-react';

export default function TeacherDashboard() {
  const { user, userData } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');

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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
        <div className="max-w-md w-full p-10 bg-white rounded-[2rem] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <h2 className="text-3xl tracking-tight font-extrabold text-black mb-4">Waiting for Approval</h2>
          <p className="text-gray-600 mb-8 font-medium">Your account is pending administrator approval. You will gain access once approved.</p>
          <button onClick={handleLogout} className="px-6 py-3 border-2 border-black rounded-full font-bold hover:bg-gray-100 transition-colors">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black">
      <nav className="bg-[#FAFAFA] border-b-2 border-black sticky top-0 z-10">
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
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-black">{userData?.name}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{userData?.subject}</p>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-10 h-10 rounded-full border border-black flex items-center justify-center hover:bg-[#FF6B57] hover:text-white transition-colors"
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                <h2 className="text-6xl tracking-tight font-extrabold text-black">Classrooms</h2>
                <button
                  onClick={() => setShowCreate(!showCreate)}
                  className="inline-flex items-center px-6 py-3 bg-[#FF6B57] text-black text-sm font-bold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-all"
                >
                  {showCreate ? 'Cancel' : 'Create Classroom'}
                </button>
              </div>

              {showCreate && (
                <div className="p-8 bg-white border-2 border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
                  <CreateClassroom onCreated={() => setShowCreate(false)} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {classrooms.map((classroom) => (
                  <Link
                    key={classroom.id}
                    to={`/classroom/${classroom.id}`}
                    className="group bg-white p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full border border-black group-hover:bg-[#FF6B57] group-hover:text-black transition-colors">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          {classroom.meetingActive && (
                            <div className="flex items-center px-3 py-1.5 bg-[#FF6B57] text-black border border-black rounded-full text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <Video className="h-3 w-3 mr-1" />
                              Live
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 rounded-full border border-gray-300 text-xs font-bold font-mono text-gray-500">
                          {classroom.classroomId}
                        </span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-black mb-1">{classroom.name}</h3>
                      <p className="text-gray-500 font-medium">{classroom.subject}</p>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t-2 border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-600">{classroom.students?.length || 0} Students</span>
                      {classroom.pendingRequests?.length > 0 && (
                        <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold border border-black">
                          {classroom.pendingRequests.length} Pending
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
                
                {classrooms.length === 0 && !showCreate && (
                  <div className="col-span-full py-16 bg-white rounded-[2rem] border-2 border-black border-dashed flex flex-col items-center justify-center text-center px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-black mb-4">
                      <BookOpen className="h-8 w-8 text-black" />
                    </div>
                    <p className="text-xl font-bold text-black mb-2">No classrooms yet</p>
                    <p className="text-gray-500 font-medium">Create your first virtual space to start teaching.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="p-6 border-b-2 border-black flex items-center bg-[#FAFAFA]">
                  <Bell className="h-6 w-6 mr-3 text-black" />
                  <h3 className="text-lg font-extrabold text-black">System Activity</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-2">
                  <NotificationsPanel classroomIds={classrooms.map(c => c.id)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
