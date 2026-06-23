import { Navigate } from 'react-router-dom';
import { useAttendantAuth } from '../context/AttendantAuthContext';

export function AttendantProtectedRoute({ children }) {
  const { attendant } = useAttendantAuth();
  if (!attendant) return <Navigate to="/login" replace />;
  return children;
}

export function AttendantGuestRoute({ children }) {
  const { attendant } = useAttendantAuth();
  if (attendant) return <Navigate to="/dashboard" replace />;
  return children;
}
