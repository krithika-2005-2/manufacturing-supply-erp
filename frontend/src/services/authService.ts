import type { LoginResponse, Paginated, User } from '../types'
import { looksLikeEmail } from '../utils/format'
import { api, unwrap } from './api'

export const loginRequest = async (identifier: string, password: string): Promise<LoginResponse> => {
  const trimmed = identifier.trim()
  const body = looksLikeEmail(trimmed)
    ? { email: trimmed, password }
    : { username: trimmed, password }
  const { data } = await api.post<{ success: true; data: LoginResponse }>('/auth/login', body)
  return unwrap(data)
}

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get<{ success: true; data: User }>('/me')
  return unwrap(data)
}

export const fetchPage = async <T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<Paginated<T>> => {
  const { data } = await api.get<{ success: true; data: T[]; meta: Paginated<T>['meta'] }>(path, {
    params,
  })
  return { data: data.data, meta: data.meta }
}
