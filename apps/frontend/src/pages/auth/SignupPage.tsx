import { Navigate } from 'react-router-dom';

// Signup is now handled inside the Login flow (Admin portal → Create Account)
// Redirect anyone who visits /signup directly to the login portal selection
export default function SignupPage() {
  return <Navigate to="/login" replace />;
}
