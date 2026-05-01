/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './modules/auth/pages/Login';
import Signup from './modules/auth/pages/Signup';
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import TeacherDashboard from './modules/teacher/pages/TeacherDashboard';
import StudentDashboard from './modules/student/pages/StudentDashboard';
import ClassroomView from './modules/shared/pages/ClassroomView';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

function RootRedirect() {
  const { user, userData, loading, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
  if (userData?.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (userData?.role === 'student') return <Navigate to="/student-dashboard" replace />;
  
  return <Navigate to="/login" replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
    if (userData?.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (userData?.role === 'student') return <Navigate to="/student-dashboard" replace />;
    // user set but userData not resolved yet — wait for Firestore
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthGuard><Login /></AuthGuard>} />
          <Route path="/signup" element={<AuthGuard><Signup /></AuthGuard>} />
          
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['teacher', 'subject_coordinator', 'headmaster']} />}>
            <Route path="/teacher-dashboard/*" element={<TeacherDashboard />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student-dashboard/*" element={<StudentDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student', 'subject_coordinator', 'headmaster']} />}>
            <Route path="/classroom/:id" element={<ClassroomView />} />
          </Route>
          
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


