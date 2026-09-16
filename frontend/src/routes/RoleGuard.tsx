import type { ReactNode } from 'react'
import type { Role } from '../types'
import { useAuth } from '../context/AuthContext'

type RoleGuardProps = {
  roles: Role[]
  children: ReactNode
  fallback?: ReactNode
}

export const RoleGuard = ({ roles, children, fallback = null }: RoleGuardProps) => {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
