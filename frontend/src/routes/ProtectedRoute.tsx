import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

export const ProtectedRoute = () => {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <LoadingSpinner label="Checking session" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
