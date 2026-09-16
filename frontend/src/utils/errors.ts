import axios from 'axios'
import type { ApiErrorBody } from '../types'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const getApiErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return error.message
    }
    return 'An unexpected error occurred'
  }

  if (!error.response) {
    return 'Unable to reach the server. Confirm the backend is running and VITE_API_BASE_URL is correct.'
  }

  const status = error.response.status
  const body = error.response.data as ApiErrorBody | undefined
  const message = body?.error?.message
  const details = body?.error?.details

  if (status === 401) {
    return message ?? 'Your session has expired. Please sign in again.'
  }
  if (status === 403) {
    return message ?? 'You do not have permission to perform this action.'
  }
  if (status === 404) {
    return message ?? 'The requested record was not found.'
  }
  if (status >= 500) {
    return 'The server could not complete this request. Confirm the backend is running and connected to the database.'
  }

  if (status === 409) {
    if (typeof message === 'string' && message.toLowerCase().includes('insufficient')) {
      return 'Insufficient stock available for this product.'
    }
    if (typeof message === 'string' && message.toLowerCase().includes('already')) {
      return message
    }
    return message ?? 'This action conflicts with the current record state.'
  }

  if (status === 400 && Array.isArray(details)) {
    const parts = details
      .map((item) => {
        if (!isRecord(item)) {
          return null
        }
        const path = typeof item.path === 'string' ? item.path : ''
        const msg = typeof item.message === 'string' ? item.message : ''
        return [path, msg].filter(Boolean).join(': ')
      })
      .filter((part): part is string => Boolean(part))
    if (parts.length > 0) {
      return parts.join(' ')
    }
  }

  if (isRecord(details) && Array.isArray(details.failures)) {
    const failures = details.failures
      .map((item) => {
        if (!isRecord(item)) {
          return null
        }
        return typeof item.reason === 'string' ? item.reason : null
      })
      .filter((part): part is string => Boolean(part))
    if (failures.length > 0) {
      return failures.join(' ')
    }
  }

  return message ?? `Request failed (${status})`
}
