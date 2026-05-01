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
import Profile from '../../shared/pages/Profile';
import { LayoutDashboard, Users, UserPlus, Shield, Activity, LogOut, BookOpen, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    signOut(auth);
  };

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
          <div className="space-y-8">
            <h2 className="text-4xl tracking-tight font-extrabold text-black flex items-center mb-8">
              <LayoutDashboard className="mr-3 w-8 h-8" />
              Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-[#FF6B57] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-extrabold text-black mb-4">Platform Management</h3>
                <p className="text-black font-medium text-lg leading-relaxed">You have full global authority. You can approve teachers, transfer students, and manage all classroom materials.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-extrabold text-black mb-4">Realtime Sync</h3>
                <p className="text-gray-700 font-medium text-lg leading-relaxed">All dashboards are connected via Firebase. Changes made here propagate instantly to student and teacher devices.</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <AnalyticsPanel />
            </div>
          </div>
        );

    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-black">
      <nav className="bg-[#FAFAFA] border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="MyMentor Logo" className="h-48 w-auto object-contain" />
              <h1 className="text-2xl font-extrabold tracking-tight hidden sm:block">Admin System</h1>
            </div>
            <div className="flex items-center space-x-6">
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

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-64 flex-shrink-0 pr-8">
          <nav className="space-y-3 sticky top-28">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${activeTab === 'overview' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`${activeTab === 'pending' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <UserPlus className="mr-3 h-5 w-5" />
              Pending
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`${activeTab === 'teachers' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <Users className="mr-3 h-5 w-5" />
              Teachers
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`${activeTab === 'students' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <Users className="mr-3 h-5 w-5" />
              Students
            </button>
            <button
              onClick={() => setActiveTab('classrooms')}
              className={`${activeTab === 'classrooms' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Classrooms
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`${activeTab === 'roles' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <Shield className="mr-3 h-5 w-5" />
              Roles
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${activeTab === 'analytics' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-gray-100'} group flex items-center px-5 py-4 text-sm font-bold rounded-full w-full border border-transparent transition-colors`}
            >
              <Activity className="mr-3 h-5 w-5" />
              Analytics
            </button>
          </nav>
        </div>

        <main className="flex-1">
          <div className="h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}


