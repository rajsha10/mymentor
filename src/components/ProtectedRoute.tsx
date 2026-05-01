import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, userData, loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = isAdmin ? 'admin' : userData?.role;
    if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
      // Redirect to appropriate dashboard if they don't have access to this route
      if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
      if (userData?.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
      if (userData?.role === 'student') return <Navigate to="/student-dashboard" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
