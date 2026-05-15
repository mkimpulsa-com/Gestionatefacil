import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  
  const ADMIN_EMAIL = 'guananjacarlosenrique@gmail.com';

  console.log("AdminRoute Debug: Current User Email:", currentUser?.email);

  if (!currentUser) {
    console.log("AdminRoute Debug: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    console.log("AdminRoute Debug: User is not Admin, redirecting to /app");
    return <Navigate to="/app" replace />;
  }
  
  console.log("AdminRoute Debug: Access granted to Admin");
  return children;
}
