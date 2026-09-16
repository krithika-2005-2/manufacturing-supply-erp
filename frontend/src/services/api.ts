import axios, { type AxiosError } from 'axios'
import { tokenStorage } from '../utils/storage'

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
      window.dispatchEvent(new Event('erp:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export const unwrap = <T>(payload: { success: boolean; data: T }): T => payload.data
